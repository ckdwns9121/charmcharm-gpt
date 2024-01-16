import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  chatGpt(@Body() body) {
    const user_id = body.userRequest.user.id;
    const msg = body.userRequest.utterance.replace('\n', '');
    console.log(msg);
    return this.appService.createAnwser(msg, user_id);
  }

  @Post('/translate')
  async translate(@Body() body) {
    const text = body.text;
    const translateText = await this.appService.deeplTransform(text);
    return translateText;
  }
}
