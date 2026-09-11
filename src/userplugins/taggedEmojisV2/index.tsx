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

interface Pastable {
    text: string;
    tags: Set<string>;
}

interface TaggedData {
    tags: string[];
    aliasToTag: Map<string, string>;
    tagNames: Map<string, string[]>;
    pastables: Pastable[];
}

let taggedData: TaggedData | undefined = undefined;
let attempted: boolean = false;
let lastDataUpdateTime: number = Date.now();
let lastEmoteList: string[] = [];
let forceUpdate: (() => void) | undefined;

function updateData() {
    if (attempted) return;
    attempted = true;
    fetch(settings.store.emojiIndexUrl)
        .then(v => v.json())
        .then(data => {
            const aliases: Record<string, string[]> = data.aliases ?? {};

            const tagNames = new Map<string, string[]>();
            const aliasToTag = new Map<string, string>();
            for (const tag of data.tags as string[]) {
                const names = [tag, ...(aliases[tag] ?? [])];
                tagNames.set(tag, names);
                for (const name of names) aliasToTag.set(name.toLowerCase(), tag);
            }

            taggedData = {
                tags: data.tags,
                aliasToTag,
                tagNames,
                pastables: (data.pastables as Array<{ text: string; tags: string[]; }>).map(p => ({
                    text: p.text,
                    tags: new Set(p.tags)
                }))
            };
            lastDataUpdateTime = Date.now();
        })
        .catch(e => logger.error("Failed to fetch/parse emoji index", e))
        .finally(() => { attempted = false; });
}

function ensureData() {
    if (Date.now() - lastDataUpdateTime > (10 * 60 * 1000) || !taggedData) {
        updateData();
        return taggedData !== undefined;
    }
    return true;
}

function resolveTag(word: string): string | undefined {
    return taggedData!.aliasToTag.get(word.toLowerCase());
}

function queryIn(text: string, n = 10) {
    if (!ensureData() || !taggedData) return [];

    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    const lastWord = words[words.length - 1].toLowerCase();
    const lower = text.toLowerCase();

    const lastTag = resolveTag(lastWord);
    const wordTags = new Set(words.map(w => resolveTag(w)).filter((t): t is string => !!t));

    const scores = new Map<string, number>();

    for (const { text: pasteText, tags } of taggedData.pastables) {
        let score = 0;

        for (const tag of tags) {
            if (tag === lastTag) {
                score += 2;
            } else if (wordTags.has(tag)) {
                score += 1;
            } else {
                const names = taggedData.tagNames.get(tag) ?? [tag];
                if (names.some(name => name.includes(" ") && lower.includes(name.toLowerCase()))) {
                    score += 1;
                }
            }
        }

        if (score > 0) scores.set(pasteText, score);
    }

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
        <img alt={`${index}`} src={`https://cdn.discordapp.com/emojis/${pasteText?.split(":")[2]?.split(">")[0]}.png?size=56`} />
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
    name: "TaggedEmojisV2",
    description: "An alternative to the emoji picker. (with some non user-friendly UI)",
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
            console.log(e.altKey, e.key);
            const num = Number.parseInt(e.key) - 1;
            if (!(!isNaN(num) && num >= 0 && num <= lastEmoteList.length)) return;

            e.preventDefault();
            console.log(currentChatBox, lastEmoteList[num]);
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
                match: /(inputFormRef=)(.*?)\(\)/,
                replace: "$1$self.giveChat($2())"
            }
        }
    ],
});
