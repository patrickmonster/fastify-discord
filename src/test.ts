import fp from 'fastify-plugin';

import discord from './index';

export default fp(function (fastify, opts) {
    fastify.register(discord, {
        DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY || 'public_key',
    });
    // fastify.register(rawBody, {
    //     field: 'rawBody',
    //     encoding: 'utf8',
    //     runFirst: true,
    // });
    // // 인증 처리 시도 - 사용자 인증 정보가 있는 경우에 시도함.
    // fastify.decorate('verifyDiscordKey', (request: FastifyRequest, reply: FastifyReply, done: Function) => {
    //     const { method, body, headers, rawBody } = request;
    //     if (method === 'POST') {
    //         const isValidRequest = verifyKey(
    //             rawBody || JSON.stringify(body),
    //             `${headers['x-signature-ed25519'] || headers['X-Signature-Ed25519']}`,
    //             `${headers['x-signature-timestamp'] || headers['X-Signature-Timestamp']}`,
    //             `${process.env.DISCORD_PUBLIC_KEY}`
    //         );
    //         if (isValidRequest) return done();
    //     }
    //     return reply.code(401).send('Bad request signature');
    // });
    // fastify.decorate(
    //     'interaction',
    //     (
    //         req: FastifyRequest<{
    //             Body: APIInteraction;
    //         }>,
    //         res: FastifyReply
    //     ): Reply => new Reply(req, res)
    // );
});
