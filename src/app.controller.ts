import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  kakaoChat(@Body() body) {
    const msg = body.userRequest.utterance.replace('\n', '');
    return this.appService.createGptMessage(msg);
  }
}
