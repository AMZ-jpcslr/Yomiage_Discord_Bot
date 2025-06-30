"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const earthquake_1 = require("../utils/earthquake");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('get_eq')
    .setDescription('直近に発表された地震情報を取得します（気象庁データ）');
function execute(interaction) {
    return __awaiter(this, void 0, void 0, function* () {
        yield interaction.deferReply();
        try {
            const res = yield fetch('https://www.jma.go.jp/bosai/quake/data/list.json');
            const list = yield res.json();
            if (!list.length) {
                yield interaction.editReply('直近の地震情報が見つかりませんでした。');
                return;
            }
            const latestId = list[0].json;
            console.log('最新地震ID:', latestId);
            // 共通関数を使用して地震情報の埋め込みを作成
            const embed = yield (0, earthquake_1.createEarthquakeEmbed)(latestId, false);
            yield interaction.editReply({ embeds: [embed] });
        }
        catch (e) {
            console.error(e);
            yield interaction.editReply('地震情報の取得中にエラーが発生しました。');
        }
    });
}
