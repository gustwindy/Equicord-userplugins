/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { ForkDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    url: {
        description: "JSON URL. {\"search\": \"replace\"}",
        type: OptionType.STRING,
        default: "https://example.com/",
    }
});

let rules: Map<string, string> | undefined = undefined;
let attempted: boolean = false;
let lastRuleUpdateTime: number = Date.now();

function updateRules() {
    if (attempted) return;
    attempted = true;
    fetch(settings.store.url).then(v => {
        v.json().then(data => {
            rules = new Map(Object.entries(data));
            lastRuleUpdateTime = Date.now();
            attempted = false;
        });
    });
}

function ensureRules() {
    if (Date.now() - lastRuleUpdateTime > (10 * 60 * 1000) || !rules) {
        updateRules();
        return rules !== undefined;
    };
    return true;
}

function applyRules(content: string) {
    if (!ensureRules()) return content;
    let result: string = content;

    rules?.forEach((replace, search) => {
        if (content === search) {
            result = replace;
        }
    });

    return result;
}

export default definePlugin({
    name: "TextReplaceURL",
    description: "replaces exact searches w/ones from url",
    dependencies: ["MessagePopoverAPI"],
    tags: ["Chat", "Customisation", "Utility"],
    authors: [ForkDevs.windy],
    settings,

    patches: [],

    start() {
        updateRules();
    },

    onBeforeMessageSend(channelId, msg) {
        msg.content = applyRules(msg.content);
    }
});
