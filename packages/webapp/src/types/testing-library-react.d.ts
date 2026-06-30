// @testing-library/react v9 не поставляет типы и не имеет пакета @types.
// Шим разблокирует typecheck для тестов (DOM-проверки гоняет vitest + jsdom).
// Матчеры (toBeInTheDocument и пр.) типизированы через @testing-library/jest-dom
// в compilerOptions.types — здесь нужен только сам модуль RTL.
declare module '@testing-library/react';
