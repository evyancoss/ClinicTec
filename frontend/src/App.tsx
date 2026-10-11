import { DemoProvider } from "./store/DemoContext";
import { AppRouter } from "./router/AppRouter";

export default function App() {
  return (
    <DemoProvider>
      <AppRouter />
    </DemoProvider>
  );
}
