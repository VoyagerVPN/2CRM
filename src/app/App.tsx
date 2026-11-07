import { ConfigProvider, Typography } from 'antd';
import ruRU from 'antd/locale/ru_RU';

export function App() {
  return (
    <ConfigProvider locale={ruRU}>
      <main>
        <Typography.Title>Объекты и задачи</Typography.Title>
        <Typography.Paragraph>Каркас проекта подготовлен. Реализация CRM ещё не начата.</Typography.Paragraph>
      </main>
    </ConfigProvider>
  );
}
