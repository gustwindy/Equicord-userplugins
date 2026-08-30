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

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { ForkDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

const defaultNotifyMessages = {
    "selfMute": ["Muted themselves", "Unmuted themselves"],
    "selfDeaf": ["Deafened themselves", "Un-deafened themselves"],
    "selfStream": ["Started streaming", "Stopped streaming"],
    "selfVideo": ["Turned on video", "Turned off video"],
    "mute": ["Got server muted", "Got un-server muted"],
    "deaf": ["Got server deafened", "Got un-server deafened"],
};
const settingNames = {
    "selfMute": "Muting",
    "selfDeaf": "Deafening",
    "selfStream": "Streaming",
    "selfVideo": "Using Camera",
    "mute": "Being Server Muted",
    "deaf": "Being Server Deafened"
};

const settingsList = {
    "enableForJoin/Leave": {
        type: OptionType.BOOLEAN,
        description: "Enable notifications for when users join/leave",
        default: true
    },
    "messageOnJoin": {
        type: OptionType.STRING,
        description: "Notification messages for when users join",
        default: "Joined your VC"
    },
    "messageOnLeave": {
        type: OptionType.STRING,
        description: "Notification messages for when users leave",
        default: "Left your VC"
    }
};

Object.keys(settingNames).forEach(key => {
    const display = settingNames[key];
    settingsList[`${key}Header`] = {
        type: OptionType.COMPONENT,
        description: "",
        component: () => (
            <div style={{
                width: "100%",
                height: 1,
                borderTop: "thin solid var(--input-border-default, var(--input-border))",
                paddingTop: 5,
                paddingBottom: 5
            }}>
            </div>
        )
    };
    const name = display.replaceAll(" ", "");

    settingsList[`enableFor${name}`] = {
        type: OptionType.BOOLEAN,
        description: `Enable notifications for when users are ${display.toLocaleLowerCase()}`,
        default: false
    };
    settingsList[`messageOn${name}`] = {
        type: OptionType.STRING,
        description: `Notification message when users start ${display.toLocaleLowerCase()}`,
        default: defaultNotifyMessages[key][0]
    };
    settingsList[`messageOff${name}`] = {
        type: OptionType.STRING,
        description: `Notification message when users stop ${display.toLocaleLowerCase()}`,
        default: defaultNotifyMessages[key][1]
    };
});

// @ts-expect-error wth
const settings = definePluginSettings(settingsList);

const states = {};
var vc: number | null = null;

function compare(messageOn: string, messageOff: string, last: boolean, current: boolean, userId: string) {
    console.log(messageOn, userId, last, current);
    if (last === current) return;
    showNotification({
        title: UserStore.getUser(userId)?.username,
        body: (current ? messageOn : messageOff),
        noPersist: true,
    });
}

export default definePlugin({
    name: "VCNotify",
    description: "(Check settings) Gives a notification whenever someone joins VC.",
    dependencies: [],
    tags: ["Voice", "Customisation", "Utility"],
    authors: [ForkDevs.windy],

    patches: [],
    settings,

    flux: {
        "RTC_CONNECTION_CLIENT_CONNECT": e => {
            if (settings.store["enableForJoin/Leave"]) return;
            const users: string[] = [];
            e.userIds.forEach(userId => {
                users.push(UserStore.getUser(userId)?.username);
            });

            showNotification({
                title: users.join(", "),
                body: settings.store["enableForJoin/Leave"],
                noPersist: true,
            });
        },
        "RTC_CONNECTION_CLIENT_DISCONNECT": e => {
            if (settings.store.enableJoinOrLeave) return;
            const users: string[] = [];
            e.userIds.forEach(userId => {
                users.push(UserStore.getUser(userId)?.username);
            });

            showNotification({
                title: users.join(", "),
                body: settings.store.messageOnLeave,
                noPersist: true,
            });
        },
        "VOICE_STATE_UPDATES": e => {
            e.voiceStates.forEach(current => {
                const last = states[current.userId];

                if (current.userId === UserStore.getCurrentUser().id) {
                    vc = current.channelId;
                }
                if (current.channelId !== vc) return;

                if (last) {
                    Object.keys(settingNames).forEach(key => {
                        const name = settingNames[key].replaceAll(" ", "");

                        if (settings.store[`enableFor${name}`]) {
                            compare(settings.store[`messageOn${name}`], settings.store[`messageOff${name}`], last[key], current[key], current.userId);
                        }
                    });
                }
                states[current.userId] = current;
            });
        }
    }
});
