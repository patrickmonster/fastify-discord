# fastify-discord

Fastify 환경에서 discord command 처리를 위한 라이브러리 입니다.

```
import discord from 'fastify-discord';

// need ts
declare module 'fastify' {
    interface FastifyInstance {
        interaction: (req: FastifyRequest<{ Body: APIInteraction }>, res: FastifyReply) => Reply;
    }
}

export default fp(async function (fastify, opts) {
    fastify.register(discord, {
        DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY || '', // Please see the Discord developer page
        decorateKey : 'verifyDiscordKey',
        decorateReply : 'decorateReply', // make interaction event
    });

    // It doesn't fit the format, but... '알잘딱갈센'
    fastify.post<{
        Body: APIInteraction;
    }>(
        '/bot',
        {
            preHandler: [fastify.verifyDiscordKey], // decorateKey
            schema: { // if you use swagger
                // hide: true.
                description: 'bot interaction event',
                summary: 'interaction event',
                tags: ['Util'],
                deprecated: false,
            },
        },
        (req, res) => { // if you need reply message not use async func
            const interaction = fastify.decorateReply(req, res);

            /* Internally, ping is handled. */
            interaction.differ({ ephemeral: true })
                .then(async () => {
                    await sleep(3000);

                    interaction.reply({ // Internally, we change interaction events to message modifications.
                        content : '안녕 이건 응답 대기 메세지 이후 메세지야'
                    })
                })
            // if you need interaction case

            switch (body.type) {
                case InteractionType.ApplicationCommand:
                    // app command 
                    break;
                case InteractionType.MessageComponent:
                    // message
                    break;
                case InteractionType.ModalSubmit:
                    // modal
                    break;
                default: // not work
                    break;
            }
        }
    );
});
```

fastify - bot commmand post event (interaction)
```
export default async (fastify: FastifyInstance, opts: any) => {
    fastify.post<{
        Body: APIInteraction;
    }>(
        '/bot',
        {
            preHandler: [fastify.verifyDiscordKey],
            schema: {
                // hide: true,
                description: '봇 인터렉션 이벤트 수신부 - 연결 및 사용 X',
                summary: '인터렉션 이벤트',
                tags: ['Util'],
                deprecated: false,
            },
        },
        (req, res) => { // if you need reply message not use async func
            const interaction = fastify.decorateReply(req, res);

            interaction.differ({ ephemeral: true })
                .then(async () => {
                    await sleep(3000);

                    interaction.reply({ // Internally, we change interaction events to message modifications.
                        content : '안녕 이건 응답 대기 메세지 이후 메세지야'
                    })
                })
            
        }
    );
};
```

# Most forms reference discord.js
## model
```
interaction.model({
    title: 'Modal create',
    custom_id: 'modal create',
    components: [
        {
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.TextInput,
                    custom_id : 'text',
                    style : TextInputStyle.Short,
                    label: '이름',
                    placeholder: '이름을 입력해 주세요.',
                    required: true,
                    max_length: 100,
                    min_length: 1,
                },
            ],
        }
    ],
});
```

# follow
```
interaction.follow({
    ephemeral: true, // Only visible to me
    embeds: [
        {
            title: '타이틀',
            description: `후앵😂 메세지`,
            color: 0x00ff00,
            image: {
                url: 'https://cdn.orefinger.click/post/466950273928134666/d2d0cc31-a00e-414a-aee9-60b2227ce42c.png',
            },
        },
    ],
});
```


# auto
```
interaction.auto({
    choices : [
        {
            name : '응애',
            value : '응애 나는 아기 개발자',
        }
    ]
});
```

# UPDATE
1.0.4
 - init

1.1.0
 - interaction 객체 내부에 데이터 첨가
 - 인증시 핑처리를 해줍니다.
 - 각 인터렉션별로 별도로 정의하였습니다.
MessageInteraction
AppInteraction
AppAutocompleteInteraction
ModelInteraction

AppChatInputInteraction
AppContextMenuInteraction
MessageButtonInteraction
MessageMenuInteraction

1.1.1
 - interaction 생성객체 (타입 치환용)