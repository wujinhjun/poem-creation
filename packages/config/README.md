# config

工作区共享构建配置 —— TypeScript / ESLint / Prettier 等。

- `tsconfig.base.json` —— 各包 tsconfig 的公共基底（`packages/shared` 通过 `extends` 继承）

不是一个 npm 包，仅作为配置文件的归集目录。
