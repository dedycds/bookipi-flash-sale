import amqp from 'amqplib';

let connection: any;
let channel: any;

export const connectRabbitMQ = async () => {
    let i = 0;
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    while (true) {
        try {
            const connection = await amqp.connect(url);
            channel = await connection.createChannel();

            // Declare the order queue
            await channel.assertQueue('order_queue', {
                durable: true,
            });
            console.log('✅ Connected to RabbitMQ');
            break;
        } catch (err) {
            if (i === 3) {
                console.error('❌ Fail to start RabitMQ', err);
                break;
            }
            console.error('❌ RabbitMQ not ready, retrying in 5s...', err);
            await new Promise(res => setTimeout(res, 5000));
            i++;
        }
    }
};

export const publishToQueue = async (queue: string, message: any) => {
    try {
        await channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
            persistent: true,
        });
    } catch (error) {
        console.error('Failed to publish message to queue:', error);
        throw error;
    }
};

export const disconnectRabbitMQ = async () => {
    if (channel) await channel.close();
    if (connection) await connection.close();
};

export const consumeFromQueue = async (
    queue: string,
    callback: (message: any) => Promise<void>
) => {
    try {
        if (!channel) {
            throw new Error('RabbitMQ channel not initialized');
        }
        // @ts-ignore
        await channel.consume(queue, async msg => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    await callback(content);
                    channel.ack(msg);
                } catch (error) {
                    console.error('Error processing message:', error);
                    // Reject the message and requeue it
                    channel.nack(msg, false, true);
                }
            }
        });
    } catch (error) {
        console.error('Failed to consume from queue:', error);
        throw error;
    }
};

export { channel };
