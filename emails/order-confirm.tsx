import {
  Html, Head, Body, Container, Section,
  Heading, Text, Link, Hr, Preview, Row, Column,
} from "@react-email/components";
import type { OrderItem, ShippingAddress } from "@/lib/types";

interface Props {
  orderId: string;
  customerName: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  totalAmount: number;
}

export function OrderConfirmEmail({
  orderId,
  customerName,
  items,
  shippingAddress,
  totalAmount,
}: Props) {
  return (
    <Html lang="ko">
      <Head />
      <Preview>주문 확인 — {orderId}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* 헤더 */}
          <Section style={logoSection}>
            <Heading style={logo}>AMORI</Heading>
          </Section>

          <Hr style={divider} />

          <Section style={content}>
            <Text style={greeting}>{customerName}님의 주문이 확인되었습니다.</Text>
            <Text style={orderIdStyle}>주문번호: {orderId}</Text>

            <Hr style={divider} />

            {/* 주문 상품 */}
            <Heading style={sectionTitle}>주문 상품</Heading>
            {items.map((item, i) => (
              <Row key={i} style={itemRow}>
                <Column style={itemName}>
                  {item.productName} × {item.quantity}
                </Column>
                <Column style={itemPrice}>
                  ₩{(item.price * item.quantity).toLocaleString("ko-KR")}
                </Column>
              </Row>
            ))}

            <Row style={totalRow}>
              <Column style={itemName}><strong>합계</strong></Column>
              <Column style={itemPrice}>
                <strong>₩{totalAmount.toLocaleString("ko-KR")}</strong>
              </Column>
            </Row>

            <Hr style={divider} />

            {/* 배송지 */}
            <Heading style={sectionTitle}>배송지</Heading>
            <Text style={addressText}>
              {shippingAddress.name} · {shippingAddress.phone}
              <br />
              [{shippingAddress.zipCode}] {shippingAddress.address}
              {shippingAddress.addressDetail && ` ${shippingAddress.addressDetail}`}
            </Text>

            <Hr style={divider} />

            <Link href="https://amori.kr/account/orders" style={cta}>
              주문 내역 확인
            </Link>

            <Text style={small}>
              평일 오전 11시 이전 주문은 당일 출고되며, 배송 기간은 1–3 영업일입니다.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderConfirmEmail;

const body = { backgroundColor: "#f5f5f5", fontFamily: "'Helvetica Neue', sans-serif" };
const container = { maxWidth: "480px", margin: "0 auto", backgroundColor: "#ffffff" };
const logoSection = { padding: "40px 40px 24px", textAlign: "center" as const };
const logo = { fontSize: "20px", letterSpacing: "0.3em", fontWeight: 300, margin: 0 };
const divider = { borderColor: "#dddddd", margin: "0" };
const content = { padding: "32px 40px" };
const greeting = { fontSize: "15px", fontWeight: 300, margin: "0 0 6px" };
const orderIdStyle = { fontSize: "11px", color: "#888888", letterSpacing: "0.1em", margin: "0 0 24px" };
const sectionTitle = { fontSize: "10px", letterSpacing: "0.25em", color: "#888888", margin: "20px 0 12px", fontWeight: 400 };
const itemRow = { padding: "6px 0" };
const totalRow = { padding: "10px 0 0", borderTop: "1px solid #dddddd", marginTop: "6px" };
const itemName = { fontSize: "12px", color: "#333333" };
const itemPrice = { fontSize: "12px", textAlign: "right" as const, color: "#333333" };
const addressText = { fontSize: "12px", color: "#555555", lineHeight: "1.8" };
const cta = {
  display: "block",
  backgroundColor: "#111111",
  color: "#ffffff",
  textAlign: "center" as const,
  padding: "14px",
  fontSize: "10px",
  letterSpacing: "0.25em",
  textDecoration: "none",
  margin: "24px 0 20px",
};
const small = { fontSize: "11px", color: "#aaaaaa", lineHeight: "1.6", margin: 0 };
