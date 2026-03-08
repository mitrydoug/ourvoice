import { FC } from "react";
import { toAlpha2 } from "../countryCodeMap";
import type { Forum } from "./ChooseForumModal";

interface ForumIconProps {
  forum: Forum;
  /** Icon height in CSS units. Defaults to "1.5rem". Width scales to 4:3 ratio. */
  size?: string;
}

/**
 * Renders the appropriate icon for a forum:
 * - Country forums: 4×3 flag SVG from /flags/
 * - Non-country forums (e.g. "global"): earth.png globe icon
 */
const ForumIcon: FC<ForumIconProps> = ({ forum, size = "1.5rem" }) => {
  if (forum.countryCode) {
    const alpha2 = toAlpha2(forum.countryCode);
    if (alpha2) {
      return (
        <img
          src={`/flags/${alpha2}.svg`}
          alt={`${forum.label} flag`}
          style={{ height: size, width: "auto", borderRadius: "3px" }}
        />
      );
    }
  }
  return (
    <img
      src="/earth.png"
      alt="Global"
      style={{ height: `calc(${size} * 1.4)`, width: "auto", borderRadius: "3px" }}
    />
  );
};

export default ForumIcon;
