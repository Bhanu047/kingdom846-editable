/* The kingdom's own guides, in Turkish and Chinese.
 *
 * These are translations of the English in kingdom.js, not separate documents —
 * same ids, same order, same paragraphs — so a reader switching language lands
 * on the same place in the same guide. Game terms people search for (KvK, NAP,
 * PvE, rally) are left recognisable rather than forced into a translation
 * nobody would type into a search box.
 *
 * A guide with no entry here shows its English text. That is the intended
 * failure: an untranslated paragraph is readable, a blank one is not.
 */
export const guideTranslations = {
  tr: {
    'kvk-prep': {
      title: 'KvK Hazırlık Listesi',
      excerpt: 'Neyi biriktirmeli, ne zaman harcamalı ve güçlü krallıklar Kingdom of Power savaşlarına nasıl hazırlanır.',
      body: [
        'KvK’ya 2 hafta kala: Zorunlu olmayan hiçbir şeye hızlandırıcı harcamayı bırakın. Asker eğitimi, inşaat ve araştırma hızlandırıcılarını biriktirin.',
        '1 hafta kala: Rally yürüyüş diziliminizi ittifak liderinizle netleştirin. En iyi 3 kahramanınızın teçhizatı takılı ve seviyeleri yüksek olsun. Kaynak stoklayın (yiyecek, odun, taş, altın) — iyileştirme ve takviye için gerekecek.',
        'Hazırlık aşaması (1-3. gün): Tüm odağınız hazırlık puanında olsun — kişisel hazırlık görevlerini tamamlayın, ittifak hazırlık teknolojisine bağış yapın ve bütün hazırlık etkinliklerine katılın. Her puan hazırlık aşamasının kazanılmasına katkı sağlar.',
        'Savaş aşaması (4-7. gün): Rally zamanlamasını ittifakınızla koordine edin. Her kale savaşına katılın. Hızlandırıcılarınızı planlı kullanın — bütün iyileştirmeyi tek seferde harcamayın. Skor tablosunu takip edin ve düşmanın hareketine göre stratejinizi değiştirin.',
        'KvK sonrası: Bir sonraki için hemen biriktirmeye başlayın. En erken hazırlanan krallık çoğu zaman kazanır.',
      ],
    },
    'nap-rules': {
      title: 'NAP Kuralları ve Kraliyet Fermanları',
      excerpt: 'Saldırmazlık anlaşmaları sezon boyunca nasıl kaydedilir, takip edilir ve uygulanır.',
      body: [
        'NAP (Saldırmazlık Anlaşması), ittifaklar arasında birbirlerine saldırmama konusunda yapılan resmi bir anlaşmadır. NAP’lar genellikle Kral ve önde gelen ittifaklar tarafından krallık düzeyinde kurulur.',
        'NAP Kaydı: NAP’lar Kingdom 846 yönetimine kaydedilir. Kral veya bir Baş Bakan; müttefik ittifakın etiketini, süresini ve varsa özel şartlarını krallık diplomasi kaydına işler.',
        'Kraliyet Fermanları: Kral, tüm krallığı bağlayan Kraliyet Fermanları çıkarabilir. Bunlara KvK hazırlığı sırasında zorunlu NAP’lar, rally koordinasyon emirleri ve kaynak paylaşım anlaşmaları dahildir.',
        'Uygulama: NAP ihlalleri Kral ve yönetim tarafından ele alınır. Tekrarlanan ihlaller krallıktan atılmayla ya da bir sonraki Kale Savaşı’nda hedef alınmayla sonuçlanabilir.',
        'Tanımadığınız bir hedefe saldırmadan önce mutlaka güncel NAP listesine bakın. Emin değilseniz ittifak liderinize sorun.',
      ],
    },
    'bear-trap': {
      title: 'Ayı Avı Rally Rehberi',
      excerpt: 'Ayı avı için en iyi dizilimler ve ödülü en üste çıkaran hesap.',
      body: [
        'Ayı Avı, ittifakların bir ayı bossunu yenmek için rally attığı bir PvE etkinliğidir. Daha yüksek hasar, tüm katılımcılar için daha iyi ödül demektir.',
        'Dizilim: Rally’de en güçlü piyade ve süvari kahramanlarınızı kullanın. Ayının savunması yüksektir; zırh delen ya da hasar artıran yeteneklere sahip kahramanlar getirin.',
        'Rally Zamanlaması: Rally’ler açılır açılmaz katılın. Dolu rally’ler yarım dolu olanlardan belirgin şekilde daha fazla hasar verir. Herkesin katılabilmesi için rally başlangıçlarını ittifakınızla sırayla planlayın.',
        'Dayanıklılık: Dayanıklılık iksirlerinizi Ayı Avı günlerine saklayın. Her rally dayanıklılık harcar; erken tükenmek ödül kademelerini kaçırmak demektir.',
        'Ödüller: Hasar barajları giderek daha iyi teçhizat malzemesi, hızlandırıcı ve kaynak verir. İttifakın toplam hasarı ayrıca ortak sandıkları açar.',
        'İpucu: Etkinlik sırasında tek başına saldırmayın — harcanan dayanıklılık başına en verimli hasar her zaman rally hasarıdır.',
      ],
    },
    'castle-battle': {
      title: 'Kale Savaşı Taktikleri',
      excerpt: 'Kale çatışmalarında rally zamanlaması, garnizon değişimi ve takviye disiplini.',
      body: [
        'Kale Savaşları bireysel güçle değil, koordinasyonla kazanılır. Rally’ler yanlış zamanlanırsa ya da takviye geç kalırsa en güçlü krallık bile kaybeder.',
        'Rally Liderleri: Savaştan önce 2-3 ana rally lideri belirleyin. Geri kalan herkes kendi rally’sini açmak yerine onların rally’lerine katılmalıdır.',
        'Garnizon Yönetimi: Kalede her zaman en güçlü savunucunuz dursun. Askerleri %60’ın altına düşen garnizon liderlerini değiştirin, yoksa savunma bir anda çöker.',
        'Takviye Disiplini: Kaleye tüm yürüyüşünüzü değil, en iyi askerlerinizi gönderin. Saldırı rally’lerine katılmaya yetecek kadar asker evde kalsın.',
        'Zamanlama: Rally’leri, birden fazla saldırı 5 saniyelik bir aralıkta düşecek şekilde ayarlayın. Böylece düşman vuruşlar arasında iyileşemez.',
        'İletişim: Kale savaşlarında sesli sohbet kullanın. Anlık rally koordinasyonu için yazılı sohbet çok yavaş kalır.',
      ],
    },
    'transfer-guide': {
      title: 'Transfer Sezonu Rehberi',
      excerpt: 'Transfer grupları, davetler ve krallık kapasitesi nasıl işler.',
      body: [
        'Transfer etkinlikleri, oyuncuların belirlenen dönemlerde krallıklar arasında geçiş yapmasına izin verir. Her krallık, yaşına ve gücüne göre bir Transfer Grubuna atanır.',
        'Uygunluk: Hesabınızın, gideceğiniz krallığın güç şartlarını karşılaması gerekir. Yüksek güçlü oyuncular için Kral’dan Özel Davet gerekebilir.',
        'Davetler: Krallık yönetimine her transfer sezonunda sınırlı sayıda Özel Davet verilir. Bunlar, krallık kadrosunu güçlendirecek oyunculara ayrılır.',
        'Transferden Önce: Kingdom 846 yönetimiyle bu portal üzerinden iletişime geçin. Onay almadan transfer olmayın — ittifak kontenjanları ve etkinlik saatleri önceden ayarlanmalıdır.',
        'Geldikten Sonra: Size verilen ittifaka hemen katılın, gerekiyorsa oyun içi isminizi/etiketinizi güncelleyin ve kendinizi ittifak liderinize tanıtın.',
      ],
    },
    'hero-meta': {
      title: 'Kahraman ve Dizilim Metası',
      excerpt: 'Dengeli yürüyüşler kurmak ve güncel kahraman nesillerine uyum sağlamak.',
      body: [
        'Dengeli bir yürüyüş, yetenekleri birbirini tamamlayan kahramanlardan kurulur. Sadece en yüksek güçlü üç kahramanı seçmeyin — uyum, güçten daha önemlidir.',
        'Piyade Kahramanları: Hasarı emmek ve mevzi tutmak için en iyisidir. Savunma, can ve hasar azaltma yeteneklerine öncelik verin.',
        'Süvari Kahramanları: Patlama hasarı ve hareket kabiliyetinde üstündür. Saldırı hızını ya da kritik vuruş şansını artıran kahramanlarla eşleştirin.',
        'Okçu/Menzilli Kahramanlar: Arka sıradan sürekli hasar verir. Önde güçlü piyadelerle onları koruyun.',
        'Kahraman Nesilleri: Yeni nesiller genelde daha güçlüdür, ama tam yükseltilmiş eski bir kahraman, düşük yıldızlı yeni bir kahramandan daha iyi iş çıkarabilir. Yenilerine yatırım yapmadan önce mevcut kahramanlarınızı bitirin.',
        'Pet Eşleşmeleri: Petleri unutmayın. Bazı petler belirli kahraman yeteneklerini tamamlayan pasif güçlendirmeler verir. En yüksek etki için petinizi kahraman diziliminize göre seçin.',
        'Karşı Seçim: KvK’da düşmanın ne çıkardığına dikkat edin. Piyade ağırlıklı yürüyüşler kullanıyorlarsa süvariyle karşılık verin. Savaşları uyum sağlayan kazanır.',
      ],
    },
  },
  zh: {
    'kvk-prep': {
      title: 'KvK 备战清单',
      excerpt: '该攒什么、什么时候用，以及顶级王国是怎么为王国之力大战做准备的。',
      body: [
        'KvK 前两周：停止把加速道具用在任何非必要的地方。囤积练兵加速、建筑加速和科技加速。',
        '前一周：和盟主确认你的集结队伍配置。确保前三名英雄装备齐全、等级到位。囤积资源（粮食、木材、石料、黄金）——治疗和增援都要用。',
        '准备阶段（第 1-3 天）：全部精力放在准备分上——完成个人准备任务、捐献联盟准备科技、参加所有准备活动。每一分都关系到准备阶段的胜负。',
        '战斗阶段（第 4-7 天）：与联盟统一集结时间。每一场城战都要参加。加速道具要用在刀刃上——不要一次把治疗全部用光。盯紧积分榜，根据对手动向随时调整打法。',
        'KvK 结束之后：立刻开始为下一场攒东西。准备得最早的王国，赢的次数最多。',
      ],
    },
    'nap-rules': {
      title: 'NAP 互不侵犯条约与王国法令',
      excerpt: '互不侵犯条约在整个赛季中如何登记、追踪和执行。',
      body: [
        'NAP（互不侵犯条约）是联盟之间约定互不攻击的正式协议。NAP 通常由国王与主要联盟在王国层面达成。',
        '条约登记：NAP 需向 Kingdom 846 领导层登记。由国王或一位首相记录进王国外交档案，内容包括盟友的联盟简称、有效期以及任何特殊条款。',
        '王国法令：国王可以颁布适用于全王国的法令，例如 KvK 备战期间的强制 NAP、集结协调命令，以及资源共享安排。',
        '执行：违反 NAP 的行为由国王与领导层处理。屡次违反者可能被踢出王国，或在下一次城战中成为目标。',
        '攻击陌生目标之前，务必先看一遍当前的 NAP 名单。拿不准就问你的盟主。',
      ],
    },
    'bear-trap': {
      title: '猎熊集结指南',
      excerpt: '猎熊活动的最佳阵容，以及把奖励拉满的算法。',
      body: [
        '猎熊是联盟集结击杀熊 BOSS 的 PvE 活动。伤害越高，所有参与者拿到的奖励越好。',
        '阵容：集结时用你最强的步兵和骑兵英雄。熊的防御很高，所以要带有破甲或增伤技能的英雄。',
        '集结时机：集结一出现就加入。满员集结的伤害远高于半满的集结。和联盟错开开团时间，让所有人都能参与。',
        '体力：把体力药水留到猎熊日。每次集结都要消耗体力，提前用完就会错过高档奖励。',
        '奖励：达到伤害档位会依次给出更好的装备材料、加速道具和资源。联盟总伤害还会解锁共享宝箱。',
        '小提示：活动期间不要单独出击——按每点体力算，集结伤害永远更划算。',
      ],
    },
    'castle-battle': {
      title: '城战战术',
      excerpt: '城池争夺中的集结时机、驻防轮换与增援纪律。',
      body: [
        '城战靠的是配合，不是个人战力。集结时间乱了、增援慢了，最强的王国也会输。',
        '集结指挥：开战前先定下 2-3 名主集结指挥。其余所有人加入他们的集结，而不是各自开团。',
        '驻防管理：城内始终留你最强的防守英雄。驻防指挥的部队掉到 60% 以下就换人，避免防线突然崩掉。',
        '增援纪律：往城里送你最精锐的部队，而不是全部兵力。留下足够的兵参加进攻集结。',
        '时机：把多个集结安排在 5 秒内先后落地，让对手来不及在两次打击之间治疗。',
        '沟通：城战期间用语音。实时集结指挥靠打字太慢了。',
      ],
    },
    'transfer-guide': {
      title: '转服季指南',
      excerpt: '转服分组、特别邀请和王国容量是怎么运作的。',
      body: [
        '转服活动允许玩家在指定的时间窗口内在王国之间迁移。每个王国会按开服时间和战力被分到一个转服分组。',
        '资格：你的账号必须满足目标王国的战力要求。战力很高的玩家可能需要国王发出的特别邀请。',
        '特别邀请：王国领导层每个转服季只有有限的特邀名额，优先留给能增强王国阵容的玩家。',
        '转服之前：通过本站联系 Kingdom 846 领导层。没有获得批准不要直接转服——联盟名额和活动时间都需要提前协调。',
        '到达之后：立刻加入分配给你的联盟，按要求更新游戏内的昵称或标签，并向你的盟主做个自我介绍。',
      ],
    },
    'hero-meta': {
      title: '英雄与阵容 Meta',
      excerpt: '如何搭出均衡的行军队伍，以及怎样跟上当前的英雄世代。',
      body: [
        '均衡的队伍靠的是技能互补的英雄。不要只挑战力最高的三个——配合比战力更重要。',
        '步兵英雄：最适合承伤和顶线。优先看防御、生命和减伤技能。',
        '骑兵英雄：爆发伤害和机动性突出。搭配能提升攻速或暴击率的英雄。',
        '弓手／远程英雄：在后排持续输出。前排要有强力步兵保护他们。',
        '英雄世代：新世代通常更强，但一个练满的老英雄，往往打得过低星的新英雄。先把手上的英雄练完，再投资新的。',
        '宠物搭配：别忘了宠物。有些宠物的被动正好补足特定英雄的技能。让宠物配合你的英雄阵容，效果最大。',
        '克制选择：KvK 里要注意对面出什么。对方以步兵为主，就用骑兵反制。会临场调整的人才赢得下来。',
      ],
    },
  },
}

/** A guide in the requested language, falling back to its English text. */
export function localizeGuide(guide, lang) {
  const tr = guideTranslations[lang]?.[guide.id]
  if (!tr) return guide
  return {
    ...guide,
    title: tr.title,
    excerpt: tr.excerpt,
    body: tr.body.join('\n\n'),
    translated: true,
  }
}
