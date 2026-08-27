import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CARE",
};

const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_dDmTX/chat";

interface Item {
  text: string;
  subs?: string[];
}

interface Section {
  title: string;
  intro?: string;
  items: Item[];
}

const sections: Section[] = [
  {
    title: "핸드메이드 안내",
    items: [
      {
        text: "Amori의 모든 제품은 한 분의 손끝에서 한 점 한 점 정성껏 만들어지는 수작업(Hand-made) 제품이에요.",
        subs: [
          "공장에서 대량으로 찍어내는 제품과 달리, 같은 디자인이라도 아주 미세한 차이가 있을 수 있어요.",
          "이런 작은 차이는 손으로 만든 물건만이 가질 수 있는 고유한 흔적이자 매력이랍니다. 불량이 아니니 안심하고 사용해 주세요.",
        ],
      },
    ],
  },
  {
    title: "원단 및 제작 특성 안내",
    intro:
      "아래의 모습들은 천연 원단과 수작업 제작 과정에서 자연스럽게 나타나는 특성이에요. 제품의 불량이 아니니, 넓은 마음으로 예뻐해 주시면 감사하겠습니다. 🤍",
    items: [
      {
        text: "사이즈는 조금씩 다를 수 있어요",
        subs: ["손으로 만들다 보니, 측정 방법에 따라 ±1~3cm 정도의 차이가 생길 수 있어요."],
      },
      {
        text: "색상이 조금 달라 보일 수 있어요",
        subs: [
          "촬영 환경과 조명, 그리고 보시는 모니터·휴대폰 화면 설정에 따라 실제 색과 다소 차이가 있을 수 있어요.",
        ],
      },
      {
        text: "원단과 바느질의 결",
        subs: [
          "원단 특성상 작은 실뭉침이나 잡사(원단에 섞인 짧은 실오라기), 결의 차이가 보일 수 있어요.",
          "바느질 과정에서 생긴 작은 바늘 자국이 남아 있을 수 있어요.",
          "모두 원단 본연의 성질이거나 만드는 과정에서 자연스럽게 생기는 모습으로, 사용하시는 데에는 전혀 문제가 없답니다.",
        ],
      },
      {
        text: "거즈 원단의 수축",
        subs: [
          "거즈 원단의 경우, 특성상 세탁 후 원단이 살짝 수축하면서 자연스러운 주름이 생길 수 있어요.",
          "말리실 때 툭툭 털어서 널어 주시면 수축과 주름을 한결 덜어 주실 수 있어요.",
          "혹시 주름이 생겨도 걱정 마세요. 주름진 거즈는 오히려 더 퐁신퐁신하고 부드러워져서, 거즈만의 포근한 매력을 한껏 느끼실 수 있답니다. 🌿",
        ],
      },
    ],
  },
  {
    title: "세탁 및 관리",
    items: [
      { text: "첫 세탁은 단독으로 해 주세요. (혹시 모를 이염을 막아 준답니다)" },
      { text: "세탁망에 넣고 중성세제로 부드럽게 세탁해 주세요." },
      { text: "건조기는 수축·변형의 원인이 될 수 있으니 피해 주시고, 툭툭 털어 자연 건조해 주세요." },
      { text: "직사광선에 오래 두면 색이 바랠 수 있으니, 그늘에서 말려 주세요." },
    ],
  },
  {
    title: "반품·교환 안내",
    intro:
      "Amori는 수작업과 천연 원단의 특성을 미리 정성껏 안내드리고 있어요. 아래 내용을 살펴봐 주시면, 받아보셨을 때 더 마음 편히 사용하실 수 있을 거예요. 🤍",
    items: [
      {
        text: "아래의 경우는 제품 불량이 아니어서, 반품·교환이 어려운 점 너그러이 양해 부탁드려요.",
        subs: [
          "위에서 안내드린 자연스러운 현상들 (±1~3cm 사이즈 차이, 촬영 환경에 따른 색상 차이, 실뭉침·잡사·원단 결 차이, 작은 바늘 자국, 거즈의 세탁 후 수축·주름 등)",
          "세탁하거나 착용하신 뒤의 단순 변심",
          "세탁 부주의(건조기·표백제 사용 등)로 인한 변형·손상",
          "사용 중 생긴 오염이나 손상",
        ],
      },
      {
        text: "아래의 경우는 언제든 편하게 도와드릴게요.",
        subs: [
          "명백한 제품 하자(봉제 불량, 오염, 파손 등)가 있는 경우",
          "주문하신 상품과 다른 상품이 배송된 경우",
          "수령 후 7일 이내, 세탁·사용하지 않은 상태라면 접수해 주세요.",
        ],
      },
      {
        text: "접수 방법",
        subs: ["아래 카카오톡 채널로 사진과 함께 편하게 말씀해 주시면, 최대한 빠르고 친절하게 도와드릴게요. 😊"],
      },
    ],
  },
];

export default function CarePage() {
  return (
    <div className="pt-[100px] pb-24 px-4 sm:px-8 lg:px-16 max-w-3xl mx-auto">
      <h1 className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-3">
        CARE &amp; NOTICE
      </h1>
      <p className="text-sm text-brand-gray-mid tracking-wide leading-7 mb-12">
        오래도록 예쁘게 사용하실 수 있도록, Amori 제품의 특성과 관리 방법을 안내해 드려요.
      </p>

      <div className="flex flex-col gap-12">
        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-4">
            <BracketHeading>{section.title}</BracketHeading>
            {section.intro && (
              <p className="text-sm text-brand-gray-mid tracking-wide leading-7">{section.intro}</p>
            )}
            <ol className="flex flex-col gap-4">
              {section.items.map((item, idx) => (
                <li key={idx} className="flex flex-col gap-2">
                  <p className="text-sm tracking-wide text-brand-black leading-7">
                    {idx + 1}. {item.text}
                  </p>
                  {item.subs && item.subs.length > 0 && (
                    <ul className="flex flex-col gap-1.5 pl-3">
                      {item.subs.map((sub) => (
                        <DashItem key={sub}>{sub}</DashItem>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}

        {/* 카카오톡 채널 바로가기 */}
        <a
          href={KAKAO_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 h-12 px-6 border border-brand-black
            text-sm tracking-widest text-brand-black hover:bg-brand-black hover:text-white transition-colors w-fit"
        >
          카카오톡 채널로 문의하기 →
        </a>
      </div>
    </div>
  );
}

function BracketHeading({ children }: { children: string }) {
  return <p className="text-[14px] tracking-widest text-brand-black">[ {children} ]</p>;
}

function DashItem({ children }: { children: string }) {
  return (
    <li className="flex gap-2 text-sm text-brand-gray-mid tracking-wide leading-7">
      <span className="shrink-0">-</span>
      <span>{children}</span>
    </li>
  );
}
