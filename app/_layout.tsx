import { Stack } from "expo-router";
import { AIChatProvider } from "../src/contexts/AIChatContext";

export default function RootLayout() {
  return (
    <AIChatProvider>
      <Stack />
    </AIChatProvider>
  );
}
