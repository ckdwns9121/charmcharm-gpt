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
  chatGpt(@Body() body) {
    const user_id = body.userRequest.user.id;
    const msg = body.userRequest.utterance.replace('\n', '');
    console.log(msg);
    return this.appService.createAnwser(msg, user_id);
  }
}
