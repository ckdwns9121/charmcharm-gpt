import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AppService {
  private readonly openai: OpenAI;
  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async createGptMessage(content: string) {
    try {
      console.log('start');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          {
            role: 'system',
            content:
              '너는 다이어트식단 전문가야.\n\n사용자의 성별과 나이, 키를 입력받으면 그에 신체에 관련된 식단을 알려줘.\n\n만약 사용자의 성별, 나이, 키를 모른다면 아래와 같이 유저에게 정보를 물어봐줘\n1. 성별:\n2. 나이: \n3. 키: ',
          },
          {
            role: 'user',
            content: content,
          },
        ],
        temperature: 1,
        max_tokens: 3000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      const prompt = response.choices[0].message.content;
      console.log('create prompt');
      const res = {
        version: '2.0',
        template: {
          outputs: [
            {
              simpleText: {
                text: prompt,
              },
            },
          ],
        },
      };
      return res;
    } catch (e) {
      console.log('error');
      console.log(e);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
