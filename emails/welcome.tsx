import {
  Html, Head, Body, Container, Section,
  Heading, Text, Link, Hr, Preview,
} from "@react-email/components";

interface Props {
  name?: string;
  couponCode?: string;
}

export function WelcomeEmail({ name = "고객", couponCode = "WELCOME5" }: Props) {
  return (
    <Html lang="ko">
      <Head />
      <Preview>AMORI에 오신 것을 환영합니다 — 첫 주문 5% 할인 코드를 드립니다</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* 로고 */}
          <Section style={logoSection}>
            <Heading style={logo}>AMORI</Heading>
            <Text style={tagline}>아기를 위한 패브릭 브랜드</Text>
          </Section>

          <Hr style={divider} />

          {/* 본문 */}
          <Section style={content}>
            <Heading style={h1}>안녕하세요, {name}님</Heading>
            <Text style={p}>
              AMORI 가족이 되어 주셔서 진심으로 감사드립니다.
              <br />
              아기의 피부에 닿는 모든 것을 소중히 만들겠습니다.
            </Text>

            {/* 쿠폰 박스 */}
            <Section style={couponBox}>
              <Text style={couponLabel}>첫 주문 웰컴 할인</Text>
              <Text style={couponCode_}>
                {couponCode}
              </Text>
              <Text style={couponDesc}>결제 시 적용 · 5% 할인 · 1회 사용</Text>
            </Section>

            <Link href="https://amori.kr/shop" style={cta}>
              지금 쇼핑하기
            </Link>

            <Hr style={divider} />

            <Text style={small}>
              이 이메일은 amori.kr 뉴스레터 구독 시 발송됩니다.
              구독을 원치 않으시면{" "}
              <Link href="https://amori.kr/unsubscribe" style={link}>
                여기서 해제
              </Link>
              하세요.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

// Styles
const body = { backgroundColor: "#f5f5f5", fontFamily: "'Helvetica Neue', sans-serif" };
const container = { maxWidth: "480px", margin: "0 auto", backgroundColor: "#ffffff" };
const logoSection = { padding: "40px 40px 24px", textAlign: "center" as const };
const logo = { fontSize: "20px", letterSpacing: "0.3em", fontWeight: 300, margin: 0 };
const tagline = { fontSize: "11px", color: "#888888", letterSpacing: "0.15em", margin: "4px 0 0" };
const divider = { borderColor: "#dddddd", margin: "0" };
const content = { padding: "32px 40px" };
const h1 = { fontSize: "20px", fontWeight: 300, letterSpacing: "0.05em", margin: "0 0 16px" };
const p = { fontSize: "13px", lineHeight: "1.8", color: "#555555", margin: "0 0 24px" };
const couponBox = {
  border: "1.5px solid #111111",
  padding: "24px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};
const couponLabel = { fontSize: "10px", letterSpacing: "0.25em", color: "#888888", margin: "0 0 8px" };
const couponCode_ = { fontSize: "24px", letterSpacing: "0.2em", fontWeight: 400, margin: "0 0 6px" };
const couponDesc = { fontSize: "10px", color: "#888888", margin: 0 };
const cta = {
  display: "block",
  backgroundColor: "#111111",
  color: "#ffffff",
  textAlign: "center" as const,
  padding: "14px",
  fontSize: "10px",
  letterSpacing: "0.25em",
  textDecoration: "none",
  margin: "0 0 24px",
};
const small = { fontSize: "11px", color: "#aaaaaa", lineHeight: "1.6" };
const link = { color: "#111111" };
