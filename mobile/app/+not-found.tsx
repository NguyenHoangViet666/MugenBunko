import { useRouter } from 'expo-router';
import { Button, Label, Screen } from '@/components/common/Screen';

export default function NotFoundScreen() {
  const router = useRouter();
  return <Screen title="Không tìm thấy trang"><Label>Liên kết này không còn tồn tại hoặc không được hỗ trợ.</Label><Button title="Về trang chủ" onPress={() => router.replace('/')} /></Screen>;
}
