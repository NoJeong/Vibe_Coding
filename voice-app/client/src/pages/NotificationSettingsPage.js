import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Stack } from "react-bootstrap";
import toast from "react-hot-toast";

const STORAGE_KEY = "notificationSettings_v1";

const DEFAULT_SETTINGS = {
  enabled: false,
  dailyReminderTime: "21:00",
  streakReminder: true,
  summaryEnabled: false,
  summaryDay: "sun",
  summaryTime: "18:00",
};

const summaryDayOptions = [
  { label: "일요일", value: "sun" },
  { label: "월요일", value: "mon" },
  { label: "화요일", value: "tue" },
  { label: "수요일", value: "wed" },
  { label: "목요일", value: "thu" },
  { label: "금요일", value: "fri" },
  { label: "토요일", value: "sat" },
];

const loadSettings = () => {
  if (typeof window === "undefined" || !window.localStorage) return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) || {}) };
  } catch (_) {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = (settings) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_) {
    toast.error("알림 설정을 저장하지 못했습니다.");
  }
};

const requestNotificationPermission = async () => {
  const cap = window.Capacitor;
  const hasBrowserNotification = typeof window !== "undefined" && "Notification" in window;

  const notifications =
    cap?.Plugins?.LocalNotifications ||
    cap?.Plugins?.Notifications ||
    cap?.Plugins?.PushNotifications;

  if (!notifications?.requestPermissions) {
    if (hasBrowserNotification) {
      try {
        const result = await window.Notification.requestPermission();
        return { granted: result === "granted", warning: result !== "granted" ? "브라우저 알림 권한을 허용해야 알림을 받을 수 있습니다." : null };
      } catch (error) {
        return { granted: false, reason: error?.message || "Notification API request failed" };
      }
    }
    return { granted: true, warning: "이 환경에서는 알림 권한을 자동으로 확인할 수 없습니다. 기기 설정에서 수동으로 알림을 허용했는지 확인해주세요." };
  }

  try {
    const result = await notifications.requestPermissions();
    const granted =
      result?.display === "granted" ||
      result?.receive === "granted" ||
      result?.granted === true;
    return { granted };
  } catch (error) {
    return { granted: false, reason: error?.message || "Unknown error" };
  }
};

const NotificationSettingsPage = () => {
  const [settings, setSettings] = useState(() => loadSettings());
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [permissionWarning, setPermissionWarning] = useState(null);
  const permissionState = useMemo(() => {
    if (!permissionChecked) return "unknown";
    return settings.enabled ? "enabled" : "disabled";
  }, [permissionChecked, settings.enabled]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleToggle = async (event) => {
    const nextEnabled = event.target.checked;
    if (nextEnabled) {
      const { granted, reason, warning } = await requestNotificationPermission();
      setPermissionChecked(true);
      if (!granted) {
        toast.error("알림 권한이 허용되지 않아 기능을 켤 수 없습니다.");
        if (reason) console.warn("Notification permission rejected:", reason);
        setPermissionWarning(reason || null);
        setSettings((prev) => ({ ...prev, enabled: false }));
        return;
      }
      toast.success("알림 권한이 허용되었습니다.");
      setPermissionWarning(warning || null);
    }
    setSettings((prev) => ({ ...prev, enabled: nextEnabled }));
  };

  const handleInputChange = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const renderPermissionNotice = () => {
    if (!settings.enabled) {
      return (
        <Alert variant="warning" className="mb-4">
          알림이 비활성화되어 있습니다. 토글을 켠 뒤 기기에서 권한을 허용해야 알림을 받을 수 있습니다.
        </Alert>
      );
    }
    if (permissionWarning) {
      return (
        <Alert variant="info" className="mb-4">
          {permissionWarning}
        </Alert>
      );
    }
    if (permissionState !== "enabled") {
      return (
        <Alert variant="info" className="mb-4">
          알림 권한이 허용되었는지 확인하려면 기기 설정 &gt; 알림에서 앱 권한을 다시 확인하세요.
        </Alert>
      );
    }
    return null;
  };

  return (
    <Row className="justify-content-center">
      <Col lg={6} md={8}>
        <Stack gap={4}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title as="h1" className="h4 mb-3">알림 설정</Card.Title>
              <Card.Text className="text-muted">
                앱에서 보내는 리마인더와 요약 알림을 관리합니다. 기기에서 알림 권한을 허용해야 실제로 알림을 받을 수 있습니다.
              </Card.Text>

              <Form>
                <Form.Check
                  type="switch"
                  id="notification-enabled"
                  label="푸시 알림 허용"
                  checked={settings.enabled}
                  onChange={handleToggle}
                />
              </Form>

              {renderPermissionNotice()}

              <div className="border-top pt-3 mt-3">
                <h2 className="h6">일일 기록 리마인더</h2>
                <p className="text-muted small mb-2">
                  매일 특정 시간에 “오늘 기록을 남기세요”라는 리마인더를 보내줍니다.
                </p>
                <Form.Group controlId="dailyReminderTime" className="mb-3">
                  <Form.Label>알림 시간</Form.Label>
                  <Form.Control
                    type="time"
                    value={settings.dailyReminderTime}
                    onChange={handleInputChange("dailyReminderTime")}
                    disabled={!settings.enabled}
                  />
                </Form.Group>
              </div>

              <div className="border-top pt-3 mt-3">
                <h2 className="h6">연속 기록 유지 알림</h2>
                <p className="text-muted small mb-2">
                  최근 며칠간 기록이 비어 있으면 “연속 기록이 끊기지 않게 오늘도 한 줄 남겨보세요” 알림을 보냅니다.
                </p>
                <Form.Check
                  type="checkbox"
                  id="streakReminder"
                  label="연속 기록 리마인더 활성화"
                  checked={settings.streakReminder}
                  onChange={handleInputChange("streakReminder")}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="border-top pt-3 mt-3">
                <h2 className="h6">주간 요약 알림</h2>
                <p className="text-muted small mb-2">
                  일주일에 한 번 최근 기록을 요약해 보내 줍니다. 기록 패턴과 키워드를 정리해서 알려드려요.
                </p>
                <Form.Check
                  type="checkbox"
                  id="summaryEnabled"
                  label="주간 요약 알림 받기"
                  checked={settings.summaryEnabled}
                  onChange={handleInputChange("summaryEnabled")}
                  disabled={!settings.enabled}
                  className="mb-3"
                />
                <Row className="g-3">
                  <Col xs={6}>
                    <Form.Group controlId="summaryDay">
                      <Form.Label>요일</Form.Label>
                      <Form.Select
                        value={settings.summaryDay}
                        onChange={handleInputChange("summaryDay")}
                        disabled={!settings.enabled || !settings.summaryEnabled}
                      >
                        {summaryDayOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={6}>
                    <Form.Group controlId="summaryTime">
                      <Form.Label>시간</Form.Label>
                      <Form.Control
                        type="time"
                        value={settings.summaryTime}
                        onChange={handleInputChange("summaryTime")}
                        disabled={!settings.enabled || !settings.summaryEnabled}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              <Alert variant="light" className="mt-4 border">
                <Alert.Heading as="h6" className="fw-semibold">권한 안내</Alert.Heading>
                <ul className="mb-0 ps-3">
                  <li className="small">알림이 수신되지 않는 경우, 기기 설정 &gt; 알림에서 이 앱이 허용되어 있는지 확인하세요.</li>
                  <li className="small">배터리 절약 모드에서는 알림이 지연될 수 있습니다.</li>
                  <li className="small">안드로이드 기기에서는 알림 채널(사운드/진동)을 별도로 설정할 수 있습니다.</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>

          <div className="d-grid gap-2 d-sm-flex justify-content-sm-end">
            <Button
              variant="secondary"
              onClick={() => {
                const restored = loadSettings();
                setSettings(restored);
                toast.success("저장된 설정을 불러왔습니다.");
              }}
            >
              저장 값 불러오기
            </Button>
            <Button
              variant="outline-danger"
              onClick={() => {
                setSettings(DEFAULT_SETTINGS);
                toast.success("알림 설정이 초기화되었습니다.");
              }}
            >
              기본값으로 초기화
            </Button>
          </div>
        </Stack>
      </Col>
    </Row>
  );
};

export default NotificationSettingsPage;
