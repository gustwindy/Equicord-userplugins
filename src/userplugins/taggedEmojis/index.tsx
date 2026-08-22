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

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { ForkDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { useState } from "@webpack/common";

const settings = definePluginSettings({
    emojisDisplayed: {
        description: "Amount of displayed emojis.",
        type: OptionType.NUMBER,
        default: 10,
    },
    emojiIndexUrl: {
        description: "URL to emoji index.",
        type: OptionType.STRING,
        default: "https://example.com/"
    }
});
const logger = new Logger("TaggedEmojis");

let currentChatBox: React.RefObject<HTMLDivElement> | null = null;

let taggedData: Map<string, Object> | undefined = undefined;
let attempted: boolean = false;
let lastDataUpdateTime: number = Date.now();
let lastEmoteList: string[] = [];
let forceUpdate: (() => void) | undefined;

function updateData() {
    if (attempted) return;
    attempted = true;
    fetch(settings.store.emojiIndexUrl).then(v => {
        v.json().then(data => {
            taggedData = new Map(Object.entries(data));
            lastDataUpdateTime = Date.now();
        }).finally(() => {
            attempted = false; // this shouldve been in the other plugin too
        });
    }).finally(() => {
        attempted = false;
    });
}

function ensureData() {
    if (Date.now() - lastDataUpdateTime > (10 * 60 * 1000) || !taggedData) {
        updateData();
        return taggedData !== undefined;
    }
    return true;
}

function queryIn(text: string, n = 10) {
    if (!ensureData() || !taggedData) return [];

    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    const lastWord = words[words.length - 1].toLowerCase();
    const lower = text.toLowerCase();
    const scores = new Map<string, number>();

    taggedData.forEach((tags, emoji) => {
        let score = 0;

        for (const [tag, tagScore] of Object.entries(tags)) {
            const lowerTag = tag.toLowerCase();

            if (lowerTag === lastWord) {
                score += tagScore * 2;
            } else if (words.some(w => w.toLowerCase() === lowerTag)) {
                score += tagScore;
            } else if (lowerTag.includes(" ") && lower.includes(lowerTag)) {
                score += tagScore;
            }
        }

        if (score > 0) {
            scores.set(emoji, score);
        }
    });

    return [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([emoji]) => emoji);
}

function EmojiDisplaySlot({
    pasteText,
    index
}: { pasteText: string, index: number; }) {
    return <span className="v-guhw-emDisplaySlot">
        <span>{index}</span>
        <img src={`https://cdn.discordapp.com/emojis/${pasteText.split(":")[2].split(">")[0]}.png?size=56`} />
    </span>;
}

function EmojiDisplay() {
    const [, setRender] = useState(0);
    forceUpdate = () => setRender(x => x + 1);

    return <div className="v-guhw-emDisplay">
        {lastEmoteList.length > 0 ? lastEmoteList.map((v, idx) => {
            return <EmojiDisplaySlot key={v} pasteText={v} index={idx + 1} />;
        }) : <span>suggestions</span>}
    </div>;
}

export default definePlugin({
    name: "TaggedEmojis",
    description: "An alternative to the emoji picker (with some non user-friendly UI.",
    dependencies: ["MessagePopoverAPI"],
    tags: ["Chat", "Utility"],
    authors: [ForkDevs.windy],
    settings,

    start() {
        ensureData();
    },

    render() {
        return <ErrorBoundary>
            <EmojiDisplay />
        </ErrorBoundary>;
    },

    giveChat(ref: React.RefObject<HTMLDivElement>) {
        currentChatBox = ref;
        return ref;
    },

    handleTextareaChange(ev, text: string, rich) {
        const next = queryIn(text, settings.store.emojisDisplayed);
        if (next.length > 0) lastEmoteList = next;

        if (forceUpdate) forceUpdate();
    },

    handleKeyDown(e: KeyboardEvent) {
        if (e.altKey && e.key) {
            const num = Number.parseInt(e.key) - 1;
            if (!(!isNaN(num) && num >= 0 && num <= lastEmoteList.length)) return;

            e.preventDefault();
            currentChatBox?.current.querySelector("[role=\"textbox\"]")?.dispatchEvent(new InputEvent("beforeinput", {
                bubbles: true,
                cancelable: true,
                inputType: "insertText",
                data: lastEmoteList[num]
            }));
        }
    },

    patches: [
        {
            find: "ChannelTextAreaForm",
            replacement: {
                match: /"form",{.*?children:\[/,
                replace: "$&$self.render(),"
            }
        },
        {
            find: "ChannelTextAreaForm",
            replacement: {
                match: /handleKeyDown=(\w+)=>{/,
                replace: "$&$self.handleKeyDown($1);"
            }
        },
        {
            find: "ChannelTextAreaForm",
            replacement: {
                match: /handleTextareaChange=\((\w+,\w+,\w+)\).*?=>{/,
                replace: "$&$self.handleTextareaChange($1);"
            }
        },
        {
            find: "ChannelTextAreaForm",
            replacement: {
                match: /(eN\.Ay,\s*\{.*?ref:)(.*?),/,
                replace: "$1$self.giveChat($2),"
            }
        }
    ],
});
