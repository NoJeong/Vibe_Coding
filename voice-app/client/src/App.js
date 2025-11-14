import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Container } from "react-bootstrap";
import { Toaster, toast } from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";
import Header from "./components/Header";
import MainPage from "./pages/MainPage";
import RecordsPage from "./pages/RecordsPage";
import LogDetailPage from "./pages/LogDetailPage";
import LogForm from "./pages/LogForm";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import "./index.css";

function App() {
  /**
   * 애플리케이션 루트 컴포넌트.
   * - Capacitor 네이티브 환경에서는 매일 저녁 9시에 기록 알림을 예약한다.
   * - 안드로이드 뒤로가기 버튼을 가로채 홈 화면에서는 두 번 눌러야 종료되게 한다.
   * - 라우터/헤더/FAB 등 공통 레이아웃을 구성해 나머지 페이지들이 이 안에서 렌더된다.
   */
  React.useEffect(() => {
    const schedule = async () => {
      const cap = window.Capacitor;
      if (!cap || cap.getPlatform?.() === "web") return;
      const LN = cap.Plugins?.LocalNotifications;
      if (!LN) return;
      try {
        await LN.requestPermissions();
        await LN.schedule({
          notifications: [{
            id: 2100,
            title: "오늘 무엇을 했나요?",
            body: "한 줄로라도 기록을 남겨 보세요.",
            schedule: { at: new Date(new Date().setHours(21, 0, 0, 0)), repeats: true, every: "day" },
          }],
        });
      } catch (e) {
        // 알림 예약 실패는 치명적이지 않으므로 무시한다.
      }
    };
    schedule();
  }, []);

  React.useEffect(() => {
    // 웹에서는 하드웨어 뒤로가기 버튼이 없으므로 네이티브에서만 처리한다.
    const cap = window.Capacitor;
    const isNative = cap && cap.getPlatform?.() !== "web";
    if (!isNative) return;

    const capacitorApp = cap.App || cap.Plugins?.App || cap?.Plugins?.AppPlugin;
    if (!capacitorApp?.addListener) return;

    // 홈 화면에서 2초 안에 두 번 눌러야 종료되도록 마지막 누름 시각을 기록한다.

    let lastBackAt = 0;
    const onBack = ({ canGoBack }) => {
      const isRoot = window.location.pathname === "/" && !canGoBack;
      if (!isRoot) {
        try {
          window.history.back();
        } catch (_) {}
        return;
      }
      const now = Date.now();
      if (now - lastBackAt < 2000) {
        try {
          capacitorApp.exitApp?.();
        } catch (_) {}
      } else {
        lastBackAt = now;
        try {
          toast.dismiss();
          toast("Press back again to exit", { duration: 1500 });
        } catch (_) {}
      }
    };

    // 구독 핸들을 기억해 컴포넌트 언마운트 시 리스너를 정리한다.

    const remove = capacitorApp.addListener("backButton", onBack);
    return () => {
      try {
        remove.remove();
      } catch (_) {}
    };
  }, []);

  React.useEffect(() => {
    if (!Capacitor.isPluginAvailable("AdMob")) return;
    const init = async () => {
      try {
        await AdMob.initialize();
      } catch (_) {
        // ignore
      }
    };
    init();
  }, []);

  return (
    <Router>
      {/* 어느 화면에서나 토스트를 띄울 수 있도록 전역 컨테이너를 둔다. */}

      <Toaster position="top-right" />
      <Header />
      <main className="app-main">
        <Container fluid className="mt-4 px-0">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/logs/:id" element={<LogDetailPage />} />
            <Route path="/new-log" element={<LogForm />} />
            <Route path="/edit-log/:id" element={<LogForm />} />
            <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
          </Routes>
        </Container>
      </main>
      {/* 음성 입력 모드가 활성화된 새 기록 작성 페이지로 이동하는 플로팅 버튼 */}

      <Link to={{ pathname: "/new-log", search: "?voice=true" }} className="fab" aria-label="음성 기록 추가">
        +
      </Link>
    </Router>
  );
}

export default App;
