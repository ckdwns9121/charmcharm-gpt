import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import OpenAI from 'openai';
import axios from 'axios';

const NUM_MAX_TOKEN = 4096;
const KAKAO_API_TIMEOUT = 5;
const WAIT_TIME = KAKAO_API_TIMEOUT - 0.5;

@Injectable()
export class AppService {
  private readonly openai: OpenAI;

  private readonly transrator: any;
  constructor(
    @InjectRedis()
    private readonly client: Redis,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async deeplTransform(text: string) {
    const targetLanguage = 'EN-US';

    try {
      const response = await axios.get(
        `https://api-free.deepl.com/v2/translate`,
        {
          params: {
            auth_key: this.configService.get('DEEPL_API_KEY'),
            text: text,
            target_lang: targetLanguage,
          },
        },
      );
      console.log(response.data);

      return response.data.translations[0].text;
    } catch (error) {
      console.log(error);
    }
  }

  kakao_response_text(text: string) {
    console.log('create kakao message');
    console.log(text);
    return {
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text,
            },
          },
        ],
      },
    };
  }

  kakao_response_button() {
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: '답변을 준비하고 있습니다.' } }],
        quickReplies: [
          {
            messageText: '답변 확인 하기',
            action: 'message',
            label: '답변 확인 하기',
          },
        ],
      },
    };
  }

  async initUserMessage(user_id) {
    const system_prompts = [
      {
        role: 'system',
        content:
          "You're a diet expert, and you're given a user's gender, age, and height, and you're asked to suggest a diet for that person based on their body specifications. Gender: \n2. Age: \n3. Height: \n4. Weight: Please answer in Korean.",
      },
    ];

    await this.client.set(
      `${user_id}-messages`,
      JSON.stringify(system_prompts),
      'EX',
      600,
    );
  }

  async updateUserMessage(user_id: string, text: string) {
    try {
      console.log(`get ${user_id} messages`);

      const message = await this.client.get(`${user_id}-messages`);
      const parseMessage = JSON.parse(message);
      parseMessage.push({ role: 'user', content: text });

      console.log(`set ${user_id} messages`);
      await this.client.set(
        `${user_id}-messages`,
        JSON.stringify(parseMessage),
      );
      return parseMessage;
    } catch (e) {
      console.log('update message error');
      console.log(e);
    }
  }

  async runGpt(messages: any, user_id: string) {
    try {
      let gpt_message = null;

      // 유저의 응답 상태 RUNNING
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        temperature: 1,
        max_tokens: NUM_MAX_TOKEN,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      // 메시지 응답
      gpt_message = response.choices[0].message.content;

      // 기존 메시지 가져오기
      const messages_redis = await this.client.get(`${user_id}-messages`);

      // 새로운 응답 추가
      const newMessages = JSON.parse(messages_redis);
      newMessages.push({ role: 'assistant', content: gpt_message });

      console.log('--------gpt message create-------');
      console.log(gpt_message);

      // GPT 응답상태에 메시지 넣기
      await this.client.set(`${user_id}-response`, gpt_message, 'EX', 600);

      // 기존 메시지에 새로운 메시지 넣기

      console.log('--------gpt message set redis-------');
      console.log(newMessages);
      await this.client.set(
        `${user_id}-messages`,
        JSON.stringify(newMessages),
        'EX',
        600,
      );
    } catch (e) {
      console.log('run gpt error');
      console.log(e);
    }
  }

  async getResponse(): Promise<string> {
    try {
      await Promise.race([
        this.runGpt('param1', 'param2'),
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        ),
      ]);
      return 'start';
    } catch (error) {
      return 'end';
    }
  }

  async createAnwser(content: string, user_id: string) {
    // 유저 응답 상태 가져오기
    const userInfo = await this.client.get(`${user_id}-response`);

    // 유저 응답 상태 없으면 초기화
    if (!userInfo) {
      console.log('none user init');
      await this.client.set(`${user_id}-response`, 'INIT', 'EX', 600);

      // GPT 시스템 셋팅
      console.log('system message setting');
      await this.initUserMessage(user_id);
    }
    if (content === '답변 확인 하기') {
      const state = await this.client.get(`${user_id}-response`);
      console.log('---------state-------');
      console.log(state);
      if (state === 'RUNNING') {
        return this.kakao_response_button();
      } else if (state === 'INIT') {
        return this.kakao_response_button();
      } else {
        return this.kakao_response_text(state);
      }
    }

    try {
      const transformText = await this.deeplTransform(content);
      console.log('------transform text------');
      console.log(transformText);
      const messages = await this.updateUserMessage(user_id, transformText);
      await Promise.race([
        this.runGpt(messages, user_id),
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error('timeout')), 4900),
        ),
      ]);
      const gpt_message = await this.client.get(`${user_id}-response`);
      console.log('-------gpt messages--------');
      console.log(gpt_message);
      await this.client.set(`${user_id}-response`, 'INIT', 'EX', 600);

      return this.kakao_response_text(gpt_message);
    } catch (error) {
      return this.kakao_response_button();
    }
  }
}
