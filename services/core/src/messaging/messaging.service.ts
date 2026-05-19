import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelModel, Channel } from 'amqplib';

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  private readonly url: string;
  private connection!: ChannelModel;
  private channel!: Channel;

  constructor(config: ConfigService) {
    this.url = config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
  }

  async onModuleInit(): Promise<void> {
    this.connection = await amqp.connect(this.url);
    this.connection.on('error', (e) => this.logger.error('RabbitMQ connection error', e));
    this.channel = await this.connection.createChannel();
    this.channel.on('error', (e) => this.logger.error('RabbitMQ channel error', e));
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  async publish(channel: string, payload: Buffer): Promise<void> {
    await this.channel.assertExchange(channel, 'fanout', { durable: false });
    this.channel.publish(channel, '', payload);
  }

  async subscribe(channel: string, handler: (msg: Buffer) => void): Promise<void> {
    await this.channel.assertExchange(channel, 'fanout', { durable: false });
    const { queue } = await this.channel.assertQueue('', {
      exclusive: true,
      autoDelete: true,
      durable: false,
    });
    await this.channel.bindQueue(queue, channel, '');
    await this.channel.consume(
      queue,
      (msg) => {
        if (msg) handler(msg.content);
      },
      { noAck: true },
    );
  }
}
