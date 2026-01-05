import { customAlphabet, nanoid } from "nanoid";

const numeric = customAlphabet("0123456789", 6);

export const generateVerificationCode = () => numeric();

export const generateToken = (size = 48) => nanoid(size);
