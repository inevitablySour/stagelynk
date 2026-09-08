import argon2 from "argon2";

const argonOptions: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string) {
  return argon2.hash(password, argonOptions);
}

export function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password, argonOptions);
}
