import React from "react";
import { HeroProps } from "./heroShared";
import { RecapBody } from "./RecapBody";

/** RECAP PHOTO : photo plein fond, tuiles blanc translucide sans bordure. */
export const HeroV1: React.FC<HeroProps> = (props) => <RecapBody {...props} />;
