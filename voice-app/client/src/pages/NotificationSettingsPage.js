import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Stack } from "react-bootstrap";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const STORAGE_KEY = "notificationSettings_v1";
const DAILY_REMINDER_NOTIFICATION_ID = 2100;

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

const scheduleDailyReminder = async (time) => {
  if (Capacitor.getPlatform?.() === "web") return;
  if (!Capacitor.isPluginAvailable("LocalNotifications")) return;
  try {
    const [hour, minute] = time.split(":").map((value) => Number(value) || 0);
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= new Date()) target.setDate(target.getDate() + 1);
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_NOTIFICATION_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_NOTIFICATION_ID,
          title: "오늘 하루를 남겨볼까요?",
          body: "간단하게라도 기록을 남겨두면 도움이 됩니다.",
          schedule: { at: target, repeats: true, every: "day" },
        },
      ],
    });
  } catch (error) {
    console.warn("Failed to schedule daily reminder", error);
  }
};

const cancelDailyReminder = async () => {
  if (!Capacitor.isPluginAvailable("LocalNotifications")) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_NOTIFICATION_ID }] });
  } catch (error) {
    console.warn("Failed to cancel reminder", error);
  }
};

const requestNotificationPermission = async () => {
  const isWeb = typeof window !== "undefined" && Capacitor.getPlatform?.() === "web";
  const hasBrowserNotification = typeof window !== "undefined" && "Notification" in window;

  if (!isWeb && Capacitor.isPluginAvailable("LocalNotifications")) {
    try {
      const result = await LocalNotifications.requestPermissions();
      const granted =
        result?.display === "granted" ||
        result?.receive === "granted" ||
        result?.granted === true;
      return { granted };
    } catch (error) {
      return { granted: false, reason: error?.message || "Unknown error" };
    }
  }

  if (hasBrowserNotification) {
    try {
      const result = await window.Notification.requestPermission();
      return {
        granted: result === "granted",
        warning: result !== "granted" ? "브라우저 설정에서 알림을 허용해야 알림을 받을 수 있습니다." : null,
      };
    } catch (error) {
      return { granted: false, reason: error?.message || "브라우저 알림 권한 요청에 실패했습니다." };
    }
  }

  return {
    granted: true,
    warning: "이 기기에서는 자동으로 권한 상태를 확인할 수 없습니다. 기기 설정에서 알림 허용 여부를 직접 확인해 주세요.",
  };
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

  useEffect(() => {
    if (!settings.enabled) {
      cancelDailyReminder();
      return;
    }
    scheduleDailyReminder(settings.dailyReminderTime);
  }, [settings.enabled, settings.dailyReminderTime]);

  const handleToggle = async (event) => {
    const nextEnabled = event.target.checked;
    if (nextEnabled) {
      const { granted, reason, warning } = await requestNotificationPermission();
      setPermissionChecked(true);
      if (!granted) {
        toast.error("알림 권한을 먼저 허용해야 합니다.");
        if (reason) console.warn("Notification permission rejected:", reason);
        setPermissionWarning(reason || null);
        setSettings((prev) => ({ ...prev, enabled: false }));
        return;
      }
      toast.success("알림이 활성화되었습니다.");
      setPermissionWarning(warning || null);
    } else {
      cancelDailyReminder();
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
          알림이 비활성화되어 있습니다. 위 스위치를 켜야 알림을 받을 수 있어요.
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
          알림이 도착하지 않으면 기기 설정에서 앱 알림 허용 여부를 다시 확인해 주세요.
        </Alert>
      );
    }
    return null;
  };

  return (
    <Row className="g-4 justify-content-center">
          <Col lg={8}>
        <Stack gap={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h1 className="h5 mb-1">알림 관리</h1>
                  <p className="text-muted mb-0">
                    기록을 잊지 않도록 원하는 시간과 요일에 알려드립니다.
        </p>
                </div>
                <Form.Check
                  type="switch"
                  id="notification-enabled"
                  label="알림 사용"
                  checked={settings.enabled}
                  onChange={handleToggle}
                />
              </div>

              {renderPermissionNotice()}

              <div className="border-top pt-3 mt-3">
                <h2 className="h6">매일 알림 시각</h2>
                <p className="text-muted small mb-2">
                  기록 알림을 받고 싶은 시간을 선택하세요.
        </p>
                <Form.Group controlId="dailyReminderTime" className="mb-3">
                  <Form.Label>시각</Form.Label>
                  <Form.Control
                    type="time"
                    value={settings.dailyReminderTime}
                    onChange={handleInputChange("dailyReminderTime")}
                    disabled={!settings.enabled}
                  />
                </Form.Group>
              </div>

              <div className="border-top pt-3 mt-3">
                <h2 className="h6">연속 기록 알림</h2>
                <p className="text-muted small mb-2">
                  연속 기록이 끊어지기 전에 미리 알려 드립니다.
        </p>
                <Form.Check
                  type="checkbox"
                  id="streakReminder"
                  label="연속 기록 유지 알림 받기"
                  checked={settings.streakReminder}
                  onChange={handleInputChange("streakReminder")}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="border-top pt-3 mt-3">
                <h2 className="h6">주간 요약 알림</h2>
                <p className="text-muted small mb-2">
                  일주일 동안의 기록을 요약해 알려 줍니다.
        </p>
                <Form.Check
                  type="checkbox"
                  id="summaryEnabled"
                  label="주간 요약 받기"
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
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={6}>
                    <Form.Group controlId="summaryTime">
                      <Form.Label>시각</Form.Label>
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
                <Alert.Heading as="h6" className="fw-semibold">
                  알림 유의사항
        </Alert.Heading>
                <ul className="mb-0 ps-3">
                  <li className="small">
                    알림이 오지 않으면 기기 설정에서 앱 알림이 차단되어 있는지 확인해 주세요.
        </li>
                  <li className="small">
                    절전 모드나 배터리 최적화가 켜져 있으면 알림이 지연될 수 있습니다.
        </li>
                  <li className="small">
                    주간 요약은 현재 선택한 언어와 테마를 기준으로 안내됩니다.
        </li>
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
                toast.success("저장된 설정을 다시 불러왔습니다.");
              }}
            >
              변경 취소
            </Button>
            <Button
              variant="outline-danger"
              onClick={() => {
                setSettings(DEFAULT_SETTINGS);
                toast.success("알림 설정을 기본값으로 초기화했습니다.");
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
