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

import { ForkDevs } from "@utils/constants";
import definePlugin from "@utils/types";

let maxStatus = 128
const whitespace = "　"; // longest non-wrapping whitespace

export default definePlugin({
    name: "MultilineStatus",
    description: "allows multilines in your status!!",
    dependencies: [],
    tags: ["Chat", "Customisation", "Utility"],
    authors: [ForkDevs.windy],

    generatePreview(text: string) {
        const lines = text.split("\n")

        const baseLength = text.replaceAll("\n", "").length
        const newlineSpace = Math.max(lines.length-1, 1)

        const remaining = maxStatus - baseLength
        if (remaining < 0) {
            return text
        }

        const perGap = Math.floor(remaining / newlineSpace) - 1

        const filler = `${(whitespace.repeat(perGap))} `
        const result = lines.join(filler)

        return result
    },
    setMaxLength(maxLength: number) {
        maxStatus = maxLength

        return maxLength
    },

    patches: [
        { // allows typing multiline
            find: ".DONT_CLEAR:return",
            replacement: {
                match: /"Enter"===t.key&&\(t.preventDefault\(\),t.shiftKey\|\|tn\(\)\)/,
                replace: "\"Enter\"===t.key&&(t.shiftKey?null:(t.preventDefault(),tn()))"
            }
        },
        { // use multiline when updated
            find: ".DONT_CLEAR:return",
            replacement: {
                match: /(tn\(.+?CUSTOM_STATUS_UPDATED.+?text:)(.+?)(,)/,
                replace: "$1$self.generatePreview($2)$3"
            }
        },
        { // use multiline on preview
            find: ".DONT_CLEAR:return",
            replacement: {
                match: /("primary".+?previewText:)(.+?)(,)/,
                replace: "$1$self.generatePreview($2)$3"
            }
        },
        { // get max length
            find: ".DONT_CLEAR:return",
            replacement: {
                match: /("primary".+?maxLength:)(.+?)(,)/,
                replace: "$1$self.setMaxLength($2)$3"
            }
        }
    ],

    start() {
    },
});
