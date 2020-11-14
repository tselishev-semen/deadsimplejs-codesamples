'use strict';
const rp = require('request-promise');
const {GoogleSpreadsheet} = require('google-spreadsheet');


module.exports.getSheet = async (event) => {
    const s = event && event.queryStringParameters && event.queryStringParameters.s;
    try {
        const doc = new GoogleSpreadsheet(process.env.doc_id);
        await doc.useServiceAccountAuth({
            client_email: process.env.client_email,
            private_key: process.env.private_key
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle[s];
        const rows = await sheet.getRows();
        const rawData = rows.map((r) => {
            return r._rawData;
        });
        return {
            statusCode: 200,
            body: JSON.stringify(rawData),
        };
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify({message: e.message}),
        };
    }

};
