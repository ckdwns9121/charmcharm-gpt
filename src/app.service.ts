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
              '너는 운동 전문가야.\n\n사용자의 성별과 나이, 키를 입력받으면 그에 신체에 관련된 식단을 알려줘.\n\n만약 사용자의 성별, 나이, 키를 모른다면 아래와 같이 답변해줘\n\n1. 성별:\n2. 나이: \n3. 키: ',
          },
          {
            role: 'user',
            content: '안녕 식단을짜줘',
          },
          {
            role: 'assistant',
            content:
              '안녕하세요! 식단을 짜드릴 수 있지만, 사용자의 성별, 나이, 키가 필요해요. 이 정보를 입력해주세요. 혹시 성별, 나이, 키를 알고 계신다면 적어주세요.\n1.성별: \n2. 나이: \n3. 키: ',
          },
          {
            role: 'user',
            content: '1. 성별: 여자\n2. 나이: 24\n3. 키: 154',
          },
          {
            role: 'assistant',
            content:
              '네, 여자분이시고 24세이며 154cm인 경우 식단을 다음과 같이 추천해드릴 수 있습니다.\n\n아침:\n- 계란 2개 (달걀흰자만 사용하는 것이 좋아요)\n- 토스트 2조각 (통밀 또는 전본식빵을 선택하세요)\n- 채소 샐러드 (당근, 오이, 양상추 등을 활용해 다양하게 만들어보세요)\n- 초코우유 1팩\n\n간식:\n- 과일 (사과, 바나나, 포도 등 선호하는 과일을 선택하세요)\n\n점심:\n- 쌀밥 1공기\n- 닭가슴살 혹은 흰살생선 (그릴이나 구이로 조리한 것이 좋아요)\n- 채소볶음 (시금치나 브로콜',
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
