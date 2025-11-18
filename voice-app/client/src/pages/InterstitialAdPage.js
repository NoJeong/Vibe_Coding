import React, { useEffect, useState } from "react";
import { Card, Container, Stack, Button, Alert } from "react-bootstrap";
import useExitInterstitialAd from "../hooks/useExitInterstitialAd";

const InterstitialAdPage = () => {
  const [status, setStatus] = useState("광고 준비 중…");
  const showAd = useExitInterstitialAd();

  const handleShowAd = async () => {
    setStatus("광고 표시 시도 중…");
    const shown = await showAd({
      onDismiss: () => {
        setStatus("광고가 종료되었습니다.");
      },
    });
    if (!shown) {
      setStatus("아직 준비되지 않아 표시하지 못했습니다.");
    }
  };

  useEffect(() => {
    handleShowAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container className="py-5" style={{ marginTop: "80px" }}>
      <Stack gap={3}>
        <h1 className="fw-bold">전면 광고 테스트</h1>
        <Card>
          <Card.Body className="d-flex flex-column gap-3">
            <p className="mb-0">
              이 페이지에서는 전면 광고를 수동으로 확인할 수 있습니다. 광고가 자동으로 열리지 않았다면 아래 버튼을 눌러 다시 시도해 보세요.
            </p>
            <Alert variant="secondary" className="mb-0">
              {status}
            </Alert>
            <div className="d-flex gap-2 flex-wrap">
              <Button variant="primary" onClick={handleShowAd}>
                전면 광고 다시 보기
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Stack>
    </Container>
  );
};

export default InterstitialAdPage;
