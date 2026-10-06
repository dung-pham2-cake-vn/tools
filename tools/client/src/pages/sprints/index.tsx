import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Sprint Alignment đã bỏ — /sprints trỏ thẳng sang Sprint Management. */
export default function SprintsIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sprints/management');
  }, [router]);

  return <div className="p-6 text-sm text-gray-500">Đang chuyển sang Sprint Management...</div>;
}
