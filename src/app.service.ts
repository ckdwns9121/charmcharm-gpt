import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import OpenAI from 'openai';

const NUM_MAX_TOKEN = 4096;
const KAKAO_API_TIMEOUT = 5;
const WAIT_TIME = KAKAO_API_TIMEOUT - 0.5;

@Injectable()
export class AppService {
  private readonly openai: OpenAI;
  constructor(
    @InjectRedis()
    private readonly client: Redis,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  kakao_response_text(text: string) {
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
          '너는 다이어트식단 전문가야.\n\n사용자의 성별과 나이, 키를 입력받으면 그에 신체 스펙에 관련된 식단을 알려줘.\n\n만약 사용자의 성별, 나이, 키를 모른다면 아래와 같이 유저에게 정보를 물어봐줘\n1. 성별:\n2. 나이: \n3. 키: ',
      },
    ];

    await this.client.set(
      `${user_id}-messages`,
      JSON.stringify(system_prompts),
    );
  }

  async updateMessage(user_id: string, text: string) {
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
        model: 'gpt-3.5-turbo-1106',
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
      newMessages.push({ role: 'user', content: gpt_message });

      // GPT 응답상태에 메시지 넣기
      await this.client.set(`${user_id}-response`, gpt_message);

      // 기존 메시지에 새로운 메시지 넣기
      await this.client.set(`${user_id}-messages`, JSON.stringify(newMessages));
    } catch (e) {
      console.log('run gpt error');
      console.log(e);
    }
  }

  async createAnwser(content: string, user_id: string) {
    try {
      // 유저 응답 상태 가져오기
      const userInfo = await this.client.get(`${user_id}-response`);

      // 유저 응답 상태 없으면 초기화
      if (!userInfo) {
        console.log('none user init');
        await this.client.set(`${user_id}-response`, 'INIT');

        // GPT 시스템 셋팅
        console.log('system message setting');
        await this.initUserMessage(user_id);
      }

      // 유저 응답 설정
      const messages = await this.updateMessage(user_id, content);

      const user_state = await this.client.get(`${user_id}-response`);
      if (user_state === 'INIT') {
        console.log('start running');
        await this.client.set(`${user_id}-response`, 'RUNNING');
      }
      this.runGpt(messages, user_id);

      const user_response = await this.client.get(`${user_id}-response`);
      console.log('---------user response------');
      console.log(user_response);
      if (user_response === 'RUNNING') {
        return this.kakao_response_button();
      } else if (user_response === 'INIT') {
        return this.kakao_response_text('답장 준비중2');
      } else {
        const gpt_message = await this.client.get(`${user_id}-response`);
        console.log('-------gpt messages--------');
        await this.client.set(`${user_id}-response`, 'INIT');
        return this.kakao_response_text(gpt_message);
      }
    } catch (e) {
      console.log('createAnwser error');
      console.log(e);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
