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
  chatGpt(@Body() body, @Res() res: Response) {
    const user_id = body.userRequest.user.id;
    const msg = body.userRequest.utterance.replace('\n', '');
    console.log(msg);
    const responseBody = {
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: 'hello',
            },
          },
        ],
      },
    };
    return responseBody;
    return this.appService.createAnwser(msg, user_id);
  }
}
