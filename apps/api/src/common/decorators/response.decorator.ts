import { SetMetadata } from "@nestjs/common";

export const RESPONSE_MESSAGE_KEY = "response:message";
export const SKIP_ENVELOPE_KEY = "response:skip-envelope";

export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
