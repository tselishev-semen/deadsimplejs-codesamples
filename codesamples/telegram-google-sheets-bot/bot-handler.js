'use strict';
const rp = require('request-promise');
const {GoogleSpreadsheet} = require('google-spreadsheet');

async function sendToUser(params) {
    const options = {
        method: 'GET',
        uri: `https://api.telegram.org/bot${process.env.token}/sendMessage`,
        qs: params
    };

    return rp(options);
}

async function editMessageText(params) {
    const options = {
        method: 'GET',
        uri: `https://api.telegram.org/bot${process.env.token}/editMessageText`,
        qs: params
    };

    return rp(options);
}

async function answerCallbackQuery(params) {
    const options = {
        method: 'GET',
        uri: `https://api.telegram.org/bot${process.env.token}/answerCallbackQuery`,
        qs: params
    };

    return rp(options);
}
// export lambda function
module.exports.webHook = async (event) => {
    try {
        /**
         * @see https://core.telegram.org/bots/api#update
         * telegram sends a message in JSON format,
         */
        const body = JSON.parse(event.body);
        const allowedIds = process.env.user_ids.split(',');
        const fromId = (body.callback_query || body.message).from.id;
        if (!allowedIds.includes(fromId)) {
            return {
                statusCode: 200,
                body: JSON.stringify({status: 'OK'}),
            };
        }
        const doc = new GoogleSpreadsheet(process.env.doc_id);
        await doc.useServiceAccountAuth({
            client_email: process.env.client_email,
            private_key: process.env.private_key
        });
        await doc.loadInfo();
        let msg;
        if (body.callback_query) {
            msg = body.callback_query;
            const key = msg.data;
            const text = msg.message.reply_to_message.text;
            const sheet = doc.sheetsById[key];
            await sheet.addRow([text], {insert: true});
            let title = `Data was saved to ${sheet.title}`;
            await Promise.all([
                answerCallbackQuery({
                    text: title,
                    callback_query_id: msg.id
                }),
                editMessageText({
                    text: title,
                    chat_id: msg.message.chat.id,
                    message_id: msg.message.message_id
                })
            ])
        } else if (body.message) {
            msg = body.message;
            await doc.loadInfo();
            const inline_keyboard = doc.sheetsByIndex.map(sheet => {
                return [{text: sheet.title, callback_data: sheet.sheetId}];
            });
            await sendToUser({
                chat_id: msg.chat.id,
                text: "Choose sheet to insert data",
                reply_to_message_id: msg.message_id,
                reply_markup: JSON.stringify({inline_keyboard: inline_keyboard})
            })
        }
        return {
            statusCode: 200,
            body: JSON.stringify({status: 'OK'}),
        };
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify({message: e.message}),
        };
    }

};
