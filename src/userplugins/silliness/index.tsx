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

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { ForkDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
// import { useRef } from "@webpack/common";

const settings = definePluginSettings({
    noEmoteThreshold: {
        description: "Amount of messages until you explode.",
        type: OptionType.NUMBER,
        default: 12,
    },
    warningThresholdDifference: {
        description: "Threshold of warning (relative to how many messages are left)",
        type: OptionType.NUMBER,
        default: 3,
    },
    toAppend: {
        description: "Text that should append once you fail to send an emote",
        type: OptionType.STRING,
        default: "im stupid and SUPER GAY"
    },
    audioUrl: {
        description: "URL of the audio that should play after you send an emote. (yes its clicker training)",
        type: OptionType.STRING,
        default: "https://example.com/"
    }
});

const emojiRegex = /(\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])|(<a?:\w+:\d+>)|:3/gm;
const audioRef: { current: HTMLAudioElement | null; } = {
    current: null
};
let messagesSinceEmote: number = 0;
let currentChatBox: React.RefObject<HTMLDivElement> | null = null;

const logger = new Logger("Silliness");

export function notify(text: string) {
    showNotification({
        title: "Silliness",
        body: text,
    });
}

function checkMessage(content: string) {
    const { noEmoteThreshold, warningThresholdDifference, toAppend, audioUrl } = settings.store;
    const warningThreshold = noEmoteThreshold - warningThresholdDifference;
    const current = currentChatBox?.current;
    const audio = audioRef?.current;

    current?.classList.toggle("v-guhw-silWarn", messagesSinceEmote >= warningThreshold);
    if (messagesSinceEmote === noEmoteThreshold - 1) {
        notify("you need to send an emote RIGHT NOW");
    }
    if (content.length < 2) return content;

    const hasEmoji = emojiRegex.exec(content) != null;
    if (hasEmoji) {
        messagesSinceEmote = 0;
        if (audio) {
            audio.volume = 0.25;
            audio.currentTime = 0;
            audio.play();
        }

        return content;
    }
    if (messagesSinceEmote >= noEmoteThreshold) {
        messagesSinceEmote = warningThreshold;
        return `${content} ${toAppend}`;
    }
    messagesSinceEmote += 1;

    return content;
}

export default definePlugin({
    name: "Silliness",
    description: "Requires you to send an emoji/emote every few messages. (otherwise append text)",
    dependencies: ["MessagePopoverAPI"],
    tags: ["Chat", "Utility"],
    authors: [ForkDevs.windy],
    settings,

    render() {
        return <ErrorBoundary>
            <audio src={settings.store.audioUrl} ref={audioRef} />
        </ErrorBoundary>;
    },

    giveChat(ref: React.RefObject<HTMLDivElement>) {
        currentChatBox = ref;
        return ref;
    },

    shouldBeWarned() {
        return messagesSinceEmote >= settings.store.noEmoteThreshold - settings.store.warningThresholdDifference;
    },

    patches: [
        {
            find: "ChannelTextAreaForm",
            replacement: {
                match: /"form",{ref:.*?children:\[/,
                replace: "$&$self.render(),"
            }
        },
        {
            find: "ChannelTextAreaForm",
            replacement: {
                match: /(eN\.Ay,\s*\{.*?className:)(.*?),/,
                replace: '$1`${$2} ${$self.shouldBeWarned() ? "v-guhw-silWarn" : ""}`,'
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

    onBeforeMessageSend(channelId, msg) {
        msg.content = checkMessage(msg.content);
    }
});
