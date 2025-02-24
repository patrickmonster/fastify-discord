import { FastifyPluginCallback, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import rawBody from 'fastify-raw-body';
import { InteractionResponseType, verifyKey } from './interaction';

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/// TYPE def
import {
    APIApplicationCommandAutocompleteInteraction,
    APIApplicationCommandInteraction,
    APIApplicationCommandInteractionData,
    APIApplicationCommandInteractionWrapper,
    APIBaseInteraction,
    APIChatInputApplicationCommandInteractionData,
    APICommandAutocompleteInteractionResponseCallbackData,
    APIContextMenuInteractionData,
    APIInteraction,
    APIMessage,
    APIMessageButtonInteractionData,
    APIMessageComponentInteraction,
    APIMessageComponentInteractionData,
    APIMessageSelectMenuInteractionData,
    APIModalInteractionResponseCallbackData,
    APIModalSubmission,
    APIModalSubmitInteraction,
    APIWebhook,
    InteractionType,
    Snowflake,
} from 'discord-api-types/v10';

import { RESTPostAPIChannelMessageJSONBody } from 'discord-api-types/rest/v10';

export type Interaction =
    | APIApplicationCommandInteraction
    | APIMessageComponentInteraction
    | APIApplicationCommandAutocompleteInteraction
    | APIModalSubmitInteraction;

export {
    APIApplicationCommandAutocompleteInteraction,
    APIApplicationCommandInteraction,
    APIApplicationCommandInteractionData,
    APIChatInputApplicationCommandInteractionData,
    APIMessageComponentInteraction,
    APIMessageComponentInteractionData,
    APIModalSubmission,
    APIModalSubmitInteraction,
    APIWebhook,
    ApplicationCommandType,
    ComponentType,
} from 'discord-api-types/v10';

// 비공개 응답
type ephemeral = { ephemeral?: boolean };

export type RESTPostAPIChannelMessage = RESTPostAPIChannelMessageJSONBody & ephemeral;
export type RESTPostAPIChannelMessageParams = RESTPostAPIChannelMessage | string;

declare module 'fastify' {
    interface FastifyInstance {
        verifyDiscordKey: (request: FastifyRequest, reply: FastifyReply, done: Function) => void;
    }
}

type BaseInteraction<
    Type extends
        | InteractionType.MessageComponent
        | InteractionType.ApplicationCommand
        | InteractionType.ApplicationCommandAutocomplete
        | InteractionType.ModalSubmit,
    APIInteractionType extends
        | APIApplicationCommandInteractionWrapper<APIApplicationCommandInteractionData>
        | APIBaseInteraction<Type, any>
> = Omit<APIInteractionType, 'data' | 'type'> & Reply<Type>;

// 메세지 명령어 인터렉션
export type MessageInteraction = BaseInteraction<InteractionType.MessageComponent, APIMessageComponentInteraction> &
    APIMessageComponentInteractionData;
// 명령어 인터렉션
export type AppInteraction = BaseInteraction<InteractionType.ApplicationCommand, APIApplicationCommandInteraction> &
    APIApplicationCommandInteractionData;
// 명령어 자동완성 인터렉션
export type AppAutocompleteInteraction = BaseInteraction<
    InteractionType.ApplicationCommandAutocomplete,
    APIApplicationCommandInteraction
> &
    APIApplicationCommandAutocompleteInteraction;
// 명령어 모달 인터렉션
export type ModelInteraction = BaseInteraction<InteractionType.ModalSubmit, APIApplicationCommandInteraction> &
    APIModalSubmission;

export type AppChatInputInteraction = BaseInteraction<
    InteractionType.ApplicationCommand,
    APIApplicationCommandInteraction
> &
    APIChatInputApplicationCommandInteractionData;
export type AppContextMenuInteraction = BaseInteraction<
    InteractionType.ApplicationCommand,
    APIApplicationCommandInteraction
> &
    APIContextMenuInteractionData;

export type MessageButtonInteraction = BaseInteraction<
    InteractionType.MessageComponent,
    APIMessageComponentInteraction
> &
    APIMessageButtonInteractionData;
export type MessageMenuInteraction = BaseInteraction<InteractionType.MessageComponent, APIMessageComponentInteraction> &
    APIMessageSelectMenuInteractionData;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

interface CustomInstance extends AxiosInstance {
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
}

// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const discordInteraction: CustomInstance = axios.create({
    baseURL: 'https://discord.com/api',
    headers: { 'Content-Type': 'application/json' },
});

discordInteraction.interceptors.response.use(
    ({ data }) => {
        console.log('================= AXIOS RESPONSE (Success) ==================');
        console.log(data);
        console.log('=============================================================');
        return data;
    },
    error => {
        console.error('================= AXIOS RESPONSE (Error) ==================');
        console.error({
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
        });
        console.error(error.config.data);
        console.error('=============================================================');
        return Promise.reject(error);
    }
);

/**
 * 응답 객체를 만듭니다
 */
export class Reply<Type extends InteractionType> {
    [key: string]: any; /* 데이터 객체를 맵핑함 */

    private req: FastifyRequest<{ Body: APIInteraction }>;
    private res: FastifyReply;
    private isReply: boolean;

    private interaction_message_id: string;

    public token: string;
    public message?: APIMessage;
    public interaction_type: Type;
    public id: Snowflake;
    public _application_id: Snowflake;

    private constructor(
        req: FastifyRequest<{
            Body: APIInteraction;
        }>,
        res: FastifyReply,
        interaction_message_id?: string /* follow 인경우 사용합니다. */
    ) {
        const {
            body: { token, application_id, message, type, data, id },
        } = req;

        /* 인터렉션 컨트롤에 필요한것 */
        this.interaction_message_id = interaction_message_id ?? '@original';
        this.isReply = false;
        this.token = token;
        this._application_id = application_id;

        this.res = res;
        this.req = req;

        this.token = token;
        this.message = message;
        this.interaction_type = type as Type;
        this.id = id;

        if (data) {
            // 데이터가 있을 경우 맵핑
            for (const [key, value] of Object.entries(data)) {
                this[key] = value;
            }
        }
    }

    /**
     * 인터렉션 타입에 따라 인스턴스를 생성합니다.
     * @param req
     * @param res
     * @returns
     */
    public static createInstance(req: FastifyRequest<{ Body: APIInteraction }>, res: FastifyReply) {
        switch (req.body.type) {
            case InteractionType.MessageComponent:
                return new Reply<InteractionType.MessageComponent>(req, res) as MessageInteraction;
            case InteractionType.ApplicationCommand:
                return new Reply<InteractionType.ApplicationCommand>(req, res) as AppInteraction;
            case InteractionType.ApplicationCommandAutocomplete:
                return new Reply<InteractionType.ApplicationCommandAutocomplete>(
                    req,
                    res
                ) as AppAutocompleteInteraction;
            case InteractionType.ModalSubmit:
                return new Reply<InteractionType.ModalSubmit>(req, res) as ModelInteraction;
            case InteractionType.Ping:
                return null;
        }
    }

    public get application_id() {
        return this._application_id;
    }

    public async get() {
        return await discordInteraction.get<APIMessage>(
            `/webhooks/${this._application_id}/${this.token}/messages/${this.interaction_message_id}`
        );
    }
    public async remove() {
        await discordInteraction.delete(
            `/webhooks/${this._application_id}/${this.token}/messages/${this.interaction_message_id}`
        );
    }

    /**
     * 메세지를 string으로 받으면 content로 설정
     * object로 받으면 그대로 설정
     *
     * ephemeral = 비공개 메세지
     * @param message
     * @returns
     */
    private appendEmpheral(message: RESTPostAPIChannelMessageParams): RESTPostAPIChannelMessageJSONBody {
        return typeof message === 'string'
            ? { content: message }
            : Object.assign(message, message.ephemeral ? { flags: 64 } : {});
    }
    /**
     * 응답
     * @param message
     */
    public async reply(message: RESTPostAPIChannelMessage) {
        // 응답
        if (this.isReply) {
            await discordInteraction
                .patch(
                    `/webhooks/${this._application_id}/${this.token}/messages/${this.interaction_message_id}`,
                    message
                )
                .catch(e => {
                    console.log(
                        '메세지 수정 실패',
                        `/webhooks/${this._application_id}/${this.token}/messages/${this.interaction_message_id}`,
                        e.response.data
                    );
                });
        } else {
            this.isReply = true;
            await this.res.code(200).send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: this.appendEmpheral(message),
            });
        }
    }
    /**
     * 선처리 응답
     * @param message
     */
    public async differ(message?: ephemeral) {
        // 선 처리 후 응답
        if (!this.isReply) {
            this.isReply = true;
            await this.res.code(200).send({
                type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
                data: { flags: message?.ephemeral ? 64 : 0 },
            });
        } else console.info('이미 응답 처리된 요청입니다.');
    }
    /**
     * 자동완성 응답
     * @param message
     * @returns
     */
    public async auto(message: APICommandAutocompleteInteractionResponseCallbackData) {
        return await this.res.status(200).send({
            type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
            data: message,
        });
    }
    /**
     * 모달 응답
     * @param message
     * @returns
     */
    public async model(message: APIModalInteractionResponseCallbackData) {
        // 모달 응답
        if (this.interaction_type !== InteractionType.ModalSubmit)
            return await this.res.status(200).send({
                type: InteractionResponseType.MODAL,
                data: message,
            });
        else return Promise.reject('모달 응답은 모달 이벤트에서 사용할 수 없습니다.');
    }
    /**
     * 선처리 메세지 수정
     * @param message
     * @returns
     */
    public async edit(message: RESTPostAPIChannelMessage) {
        // 선처리 메세지 수정 ( 인터렉션 전의 이벤트)
        if (this.interaction_type === InteractionType.MessageComponent)
            return await this.res.status(200).send({
                type: InteractionResponseType.UPDATE_MESSAGE,
                data: message,
            });
        else return Promise.reject('선처리 메세지 수정은 컴포넌트 이벤트에서만 사용할 수 있습니다.');
    }
    /**
     * 후행 선처리 메세지 수정
     * @param message
     */
    public async differEdit(message: RESTPostAPIChannelMessage) {
        if (this.interaction_type === InteractionType.MessageComponent)
            return await this.res.status(200).send({
                type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
                data: message,
            });
        else return Promise.reject('선처리 메세지 수정은 컴포넌트 이벤트에서만 사용할 수 있습니다.');
    }

    /**
     * 후행 처리 응답 메세지
     * @param message
     * @returns
     */
    public async follow(message: RESTPostAPIChannelMessage) {
        return await discordInteraction
            .post<APIWebhook>(`/webhooks/${this._application_id}/${this.token}`, this.appendEmpheral(message))
            .then(({ id }) => new Reply(this.req, this.res, id));
    }

    *[Symbol.iterator]() {
        yield ['get', this.get.bind(this)];
        yield ['remove', this.remove.bind(this)];
        yield ['auto', this.auto.bind(this)];
        yield ['differ', this.differ.bind(this)];
        yield ['differEdit', this.differEdit.bind(this)];
        yield ['edit', this.edit.bind(this)];
        yield ['follow', this.follow.bind(this)];
        yield ['model', this.model.bind(this)];
        yield ['reply', this.reply.bind(this)];
    }
}

interface FastifyDiscordPluginOptions extends FastifyPluginOptions {
    DISCORD_PUBLIC_KEY: string;
    decorateKey?: string;
    decorateReply?: string;
}
/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
const plugin: FastifyPluginCallback<FastifyDiscordPluginOptions> = fp<FastifyDiscordPluginOptions>(
    async (fastify, opts) => {
        fastify.register(rawBody, {
            field: 'rawBody',
            encoding: 'utf8',
            runFirst: true,
        });

        // 인증 처리 시도 - 사용자 인증 정보가 있는 경우에 시도함.
        fastify.decorate(
            opts.decorateKey || 'verifyDiscordKey',
            (request: FastifyRequest<{ Body: APIInteraction }>, reply: FastifyReply, done: Function) => {
                const { method, body, headers, rawBody } = request;
                if (method === 'POST') {
                    const isValidRequest = verifyKey(
                        rawBody || JSON.stringify(body),
                        `${headers['x-signature-ed25519'] || headers['X-Signature-Ed25519']}`,
                        `${headers['x-signature-timestamp'] || headers['X-Signature-Timestamp']}`,
                        `${opts.DISCORD_PUBLIC_KEY}`
                    );

                    if (body.type === InteractionType.Ping)
                        /* 응답을 처리합니다 */
                        return reply.status(200).send({ type: InteractionResponseType.PONG });

                    if (isValidRequest) return done();
                }
                return reply.code(401).send('Bad request signature');
            }
        );

        if (opts.decorateReply)
            fastify.decorate(
                opts.decorateReply,
                (
                    req: FastifyRequest<{
                        Body: APIInteraction;
                    }>,
                    res: FastifyReply
                ) => Reply.createInstance(req, res)
            );
    },
    {
        name: 'fastify-discord',
        fastify: '^4.x',
    }
);

export default plugin;
