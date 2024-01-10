import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  kakaoChat(@Body() body, @Res() res: Response) {
    const middleRes = {
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: '답변 생성중',
            },
          },
        ],
      },
    };
    res.status(200).send(middleRes);
    const msg = body.userRequest.utterance.replace('\n', '');
    return this.appService.createGptMessage(msg);
  }
}
