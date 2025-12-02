import { useRouter } from "expo-router";
import StartVoiceOrderScreen from "../src/screens/StartVoiceOrderScreen";

const navigationBridge = (router: ReturnType<typeof useRouter>) => ({
  navigate: (routeName: string, params?: Record<string, unknown>) => {
    switch (routeName) {
      case "EatOrTakeScreen":
        router.push("/EatOrTakeScreen");
        break;
      case "QrOrderScreen":
      case "QRScanInstructionScreen":
        router.push("/QRScanInstructionScreen");
        break;
      default:
        console.warn(`라우트 "${routeName}"가 Expo Router에 아직 연결되지 않았습니다.`, params);
    }
  },
  goBack: () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      console.warn("돌아갈 수 있는 이전 화면이 없습니다.");
    }
  },
});

export default function Index() {
  const router = useRouter();
  const navigation = navigationBridge(router);

  return <StartVoiceOrderScreen navigation={navigation} />;
}
