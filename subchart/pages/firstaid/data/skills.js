/**
 * 家庭急救跟做训练器 - 技能数据
 *
 * 每个技能由若干 segment（步骤段）组成。segment 类型：
 *  - manual    : 阅读要点，用户点"下一步"继续
 *  - countdown : 倒计时 N 秒后自动进入下一步（如冲洗、压迫）
 *  - press     : 按节拍按压/冲击 count 次（带节拍器、震动、计数），做完自动下一步
 *  - breath    : 吹气步骤，倒计时（带轻柔节奏提示）
 *  - cycle     : 将 children 循环 rounds 轮（如 CPR 的 5 轮 30:2）
 */

const SKILLS = [
  {
    id: 'adult_cpr',
    name: '成人心肺复苏',
    icon: '/subchart/pages/firstaid/icons/cpr.png',
    category: '成人急救',
    short: '成人 CPR',
    description: '把握黄金4分钟：按压频率100-120次/分，按压:吹气=30:2，持续5轮',
    keyPoints: [
      '按压位置：两乳头连线中点（胸骨下半部）',
      '按压深度5-6cm，频率100-120次/分',
      '按压:吹气 = 30:2',
      '持续5轮后检查反应，尽快使用AED',
    ],
    warnings: [
      '按压需快速、用力、不中断（中断勿超10秒）',
      '未经专业培训者，持续按压优先，可只按压不吹气',
    ],
    segments: [
      { type: 'manual', title: '确认环境安全', text: '观察周围是否安全，避免施救者和伤员二次受伤' },
      { type: 'manual', title: '判断意识与呼吸', text: '轻拍双肩、大声呼唤；观察胸廓起伏，判断不超10秒' },
      { type: 'manual', title: '立即呼救', text: '让身边人拨打120、取AED；若独自一人，先按压再抽空呼救' },
      {
        type: 'cycle', rounds: 5, label: '轮',
        children: [
          { type: 'press', title: '按压30次', text: '掌根置于两乳头连线中点，双臂伸直垂直下压5-6cm', count: 30, bpm: 110 },
          { type: 'breath', title: '人工呼吸2次', text: '仰头抬颏开放气道，捏鼻口对口吹气，每次约1秒', seconds: 5 },
        ],
      },
      { type: 'manual', title: '检查与持续', text: '5轮后检查反应与呼吸；未恢复则继续CPR，直至AED/急救到达' },
    ],
  },
  {
    id: 'adult_heimlich',
    name: '成人海姆立克',
    icon: '/subchart/pages/firstaid/icons/heimlich.png',
    category: '成人急救',
    short: '成人气道梗阻',
    description: '清醒成人气道异物梗阻：脐上两横指处向内上方快速冲击',
    keyPoints: [
      '拳眼（拇指侧）对准脐上两横指处',
      '另一手包住拳头，向内上方快速冲击，每秒约1次',
      '反复冲击直至异物排出',
    ],
    warnings: [
      '1岁以下婴儿严禁腹部冲击，改用"拍背+压胸"法',
      '孕妇或肥胖者：冲击位置改在胸骨下半部',
    ],
    segments: [
      { type: 'manual', title: '判断梗阻', text: '突然无法说话/咳嗽、无法呼吸、面色青紫 → 气道异物梗阻' },
      { type: 'manual', title: '站位', text: '站患者身后，双臂环抱其腰部，让患者身体前倾' },
      { type: 'manual', title: '握拳定位', text: '一手握拳，拳眼（拇指侧）对准脐上两横指处' },
      {
        type: 'cycle', rounds: 3, label: '组',
        children: [
          { type: 'press', title: '腹部冲击5次', text: '另一手包住拳头，向内上方快速冲击，每秒约1次', count: 5, bpm: 60 },
          { type: 'manual', title: '检查', text: '观察异物是否排出、患者能否说话咳嗽' },
        ],
      },
      { type: 'manual', title: '意识丧失处理', text: '若患者失去意识 → 轻轻平放，立即拨打120，转为心肺复苏' },
    ],
  },
  {
    id: 'infant_choking',
    name: '婴儿气道梗阻',
    icon: '/subchart/pages/firstaid/icons/choking.png',
    category: '婴儿急救',
    short: '婴儿呛噎',
    description: '1岁以下婴儿：5次拍背+5次压胸循环，严禁腹部冲击',
    keyPoints: [
      '拍背：面朝下置前臂，头低脚高，掌根拍两肩胛骨间5次',
      '压胸：翻转仰卧仍头低脚高，掌根压两乳头连线中点下方5次',
      '"5次拍背+5次压胸"交替循环，直至异物排出或婴儿哭闹',
    ],
    warnings: [
      '严禁腹部冲击！婴儿内脏娇嫩极易受损',
      '注意托稳下巴、不要捂住口鼻',
      '若婴儿失去意识：立即停止冲击，转婴儿CPR并拨打120',
    ],
    segments: [
      { type: 'manual', title: '判断梗阻', text: '婴儿突然剧烈咳嗽、无法哭闹、嘴唇发紫 → 气道梗阻' },
      { type: 'manual', title: '摆放体位', text: '面朝下置于前臂，用手托住下巴，保持"头低脚高"、身体自然下垂' },
      {
        type: 'cycle', rounds: 3, label: '循环',
        children: [
          { type: 'press', title: '拍背5次', text: '掌根连续拍击两肩胛骨之间，力度轻柔但有明显震荡感', count: 5, bpm: 50 },
          { type: 'press', title: '压胸5次', text: '翻转面部朝上仍头低脚高，掌根在两乳头连线中点下方按压5次', count: 5, bpm: 50 },
        ],
      },
      { type: 'manual', title: '观察恢复', text: '异物排出或婴儿哭闹/恢复呼吸 → 停止并观察，必要时送医' },
      { type: 'manual', title: '意识丧失处理', text: '若婴儿失去意识 → 立即开始婴儿心肺复苏，并让旁人拨打120' },
    ],
  },
  {
    id: 'infant_cpr',
    name: '婴儿心肺复苏',
    icon: '/subchart/pages/firstaid/icons/infant_cpr.png',
    category: '婴儿急救',
    short: '婴儿 CPR',
    description: '两指按压两乳头连线中点下方，深度约4cm，30:2，5轮循环',
    keyPoints: [
      '两指（或双拇指环抱）按压，深度约4cm',
      '频率100-120次/分，按压:吹气 = 30:2',
      '吹气时用嘴包裹婴儿口鼻轻吹，避免过猛伤肺',
    ],
    warnings: [
      '吹气要轻柔，防止损伤婴儿肺部',
      '独自一人时：先做2分钟CPR再抽空拨打120',
    ],
    segments: [
      { type: 'manual', title: '判断反应与呼吸', text: '轻拍脚底、大声呼唤，观察胸廓起伏，判断不超10秒' },
      { type: 'manual', title: '呼救', text: '如有人在场立即拨打120；独自一人先做2分钟CPR再呼救' },
      {
        type: 'cycle', rounds: 5, label: '轮',
        children: [
          { type: 'press', title: '两指按压30次', text: '两指置于两乳头连线中点下方，垂直下压约4cm', count: 30, bpm: 110 },
          { type: 'breath', title: '轻吹2次', text: '用嘴包裹婴儿口鼻轻吹，每次约1秒，避免过猛', seconds: 5 },
        ],
      },
      { type: 'manual', title: '持续至恢复', text: '持续按压吹气循环，直至婴儿恢复呼吸或急救人员到达' },
    ],
  },
  {
    id: 'infant_fall',
    name: '婴儿坠床/头部撞击',
    icon: '/subchart/pages/firstaid/icons/fall.png',
    category: '婴儿急救',
    short: '坠床摔伤',
    description: '先判断意识与外伤，观察24-48小时；出现危险信号立即就医',
    keyPoints: [
      '先保持冷静，轻拍呼唤判断意识',
      '检查有无出血、肿胀、肢体活动异常',
      '观察24-48小时：精神状态、是否呕吐/嗜睡',
      '无异常可先安抚，有异常立即就医',
    ],
    warnings: [
      '出现意识不清、反复呕吐、抽搐、嗜睡难叫醒 → 立即就医',
      '鼻/耳流出血水、前囟隆起、瞳孔异常 → 立即就医',
      '不要剧烈摇晃或喂水催吐',
      '6月龄后会翻身的宝宝，床上要装护栏、床边铺软垫',
    ],
    segments: [
      { type: 'manual', title: '保持冷静', text: '先深呼吸，不要立刻抱起哭闹的宝宝，观察几秒' },
      { type: 'manual', title: '判断意识', text: '轻拍脚底、大声呼唤，观察宝宝反应和呼吸是否正常' },
      { type: 'manual', title: '检查外伤', text: '查看头部有无肿包、出血，四肢能否正常活动（不要按压肿包）' },
      { type: 'countdown', title: '持续观察', text: '无异常时安抚宝宝，持续观察（本课演示30秒）', seconds: 30 },
      { type: 'manual', title: '危险信号拨打120', text: '出现意识不清、反复呕吐、抽搐、嗜睡、耳鼻流血水 → 立即拨打120就医' },
    ],
  },
  {
    id: 'infant_fever_seizure',
    name: '婴儿热性惊厥',
    icon: '/subchart/pages/firstaid/icons/fever_seizure.png',
    category: '婴儿急救',
    short: '高热惊厥',
    description: '侧卧防误吸、记录时间、散热降温；发作超5分钟立即拨打120',
    keyPoints: [
      '立即将宝宝侧卧，头偏向一侧，防止呕吐物误吸',
      '移开周围硬物，保护头部',
      '记录发作开始时间',
      '解开衣物散热，发作停止后仍需就医评估',
    ],
    warnings: [
      '不要往宝宝嘴里塞任何东西（会损伤牙齿和气道）',
      '不要强行按压、摇晃或掐人中',
      '发作超5分钟、24小时内反复发作、发作后意识不恢复 → 立即拨打120',
      '禁止用酒精擦浴降温',
    ],
    segments: [
      { type: 'manual', title: '保持冷静侧卧', text: '将宝宝侧卧、头偏向一侧，防止呕吐物误吸入肺' },
      { type: 'manual', title: '移开危险物', text: '移开周围坚硬物品，用手/软垫保护宝宝头部' },
      { type: 'manual', title: '记录时间', text: '立即查看时间并记住发作开始时刻' },
      { type: 'countdown', title: '计时观察', text: '本课演示计时30秒；真实情况记录发作时长', seconds: 30 },
      { type: 'manual', title: '散热降温', text: '解开衣领、散热；发热明显时用温水擦浴，禁止酒精' },
      { type: 'manual', title: '超时拨打120', text: '发作超5分钟、反复发作或意识不恢复 → 立即拨打120就医' },
    ],
  },
  {
    id: 'infant_milk_choking',
    name: '婴儿呛奶/吐奶',
    icon: '/subchart/pages/firstaid/icons/milk_choking.png',
    category: '婴儿急救',
    short: '呛奶处理',
    description: '呛奶时立即侧卧/俯卧前倾、拍背引流；面色青紫则按气道梗阻处理',
    keyPoints: [
      '立即将宝宝侧卧或俯卧前倾，头低脚高，让奶液流出',
      '空心掌轻拍背部帮助排出',
      '清理口鼻腔残留奶液',
      '呼吸恢复正常后仍需观察',
    ],
    warnings: [
      '宝宝无法呼吸、面色青紫 → 立即按"婴儿气道梗阻"处理并拨打120',
      '不要将宝宝竖直抱起拍背（易让奶液呛入更深处）',
      '频繁呛奶、每次吃奶都呛 → 建议就医排查',
      '喂奶后记得拍嗝、右侧卧位，减少吐奶误吸',
    ],
    segments: [
      { type: 'manual', title: '改变体位', text: '立即让宝宝侧卧或俯卧在你的前臂上，头低脚高' },
      { type: 'manual', title: '拍背引流', text: '用空心掌轻拍宝宝背部，帮助奶液流出（手法同拍背法）' },
      { type: 'manual', title: '清理口鼻', text: '用纱布/软毛巾轻轻清理口鼻腔残留奶液' },
      { type: 'manual', title: '观察呼吸', text: '确认宝宝呼吸平稳、面色恢复红润' },
      { type: 'manual', title: '严重拨打120', text: '若仍无法呼吸、面色青紫 → 立即按婴儿气道梗阻急救并拨打120' },
    ],
  },
  {
    id: 'infant_swallow',
    name: '婴儿误吞异物',
    icon: '/subchart/pages/firstaid/icons/swallow.png',
    category: '婴儿急救',
    short: '误吞处理',
    description: '先判断卡在气道还是吞入消化道；危险物（电池/磁铁/尖锐物）立即就医',
    keyPoints: [
      '先判断：能哭闹呼吸=消化道，面色青紫无呼吸=气道梗阻',
      '消化道小异物多数可随粪便排出，观察排便',
      '电池、磁铁、尖锐物、腐蚀性物品 → 立即就医',
      '出现呕吐、腹痛、便血、拒食 → 立即就医',
    ],
    warnings: [
      '不要盲目催吐（尖锐或腐蚀性物更危险）',
      '卡住气道 → 立即用"婴儿气道梗阻"急救法',
      '吞入多枚磁铁/硬币或电池 → 立即就医，勿等待',
      '小零件、硬币、电池、纽扣要放在宝宝够不到的地方',
    ],
    segments: [
      { type: 'manual', title: '判断情况', text: '宝宝能否哭闹、呼吸顺畅？面色是否正常？' },
      { type: 'manual', title: '气道梗阻处理', text: '若面色青紫、无法呼吸 → 立即转婴儿气道梗阻急救并拨打120' },
      { type: 'manual', title: '消化道观察', text: '呼吸正常多为吞入消化道，观察后续排便，多数可自行排出' },
      { type: 'manual', title: '危险物就医', text: '吞入电池/磁铁/尖锐物/腐蚀物 → 立即就医，不要等待排便' },
      { type: 'manual', title: '异常信号就医', text: '出现呕吐、腹痛、便血、拒食、精神差 → 立即就医' },
    ],
  },
  {
    id: 'infant_drowning',
    name: '婴儿溺水/呛水',
    icon: '/subchart/pages/firstaid/icons/bath.png',
    category: '婴儿急救',
    short: '溺水呛水',
    description: '立即抱离、侧卧清理口鼻；无呼吸立即婴儿CPR并拨打120',
    keyPoints: [
      '立即将宝宝抱离水面，侧卧清理口鼻腔',
      '判断意识和呼吸',
      '无呼吸/无反应 → 立即开始婴儿CPR，让旁人拨打120',
      '即使恢复也建议就医观察（警惕迟发性肺水肿）',
    ],
    warnings: [
      '婴儿溺水发展极快，洗澡时务必寸步不离、用手托扶',
      '无呼吸时不要浪费时间控水/倒水，立即CPR',
      '恢复呼吸后也要就医排查（二次溺水风险）',
      '浴缸、水桶、充气泳池用后立即倒空',
    ],
    segments: [
      { type: 'manual', title: '脱离水面', text: '立即将宝宝抱离水面，放在平坦安全处，侧卧' },
      { type: 'manual', title: '清理口鼻', text: '清除口鼻腔内的水、分泌物、异物' },
      { type: 'manual', title: '判断呼吸', text: '观察胸廓起伏、拍打呼唤判断反应' },
      { type: 'manual', title: '无呼吸处理', text: '无呼吸/无反应 → 立即开始婴儿心肺复苏，让旁人拨打120' },
      { type: 'manual', title: '就医观察', text: '即使恢复呼吸也应尽快就医，排查迟发性肺水肿' },
    ],
  },
  {
    id: 'bleeding',
    name: '止血包扎',
    icon: '/subchart/pages/firstaid/icons/bleeding.png',
    category: '通用急救',
    short: '外伤止血',
    description: '直接压迫止血为主，配合抬高、加压包扎；必要时使用止血带',
    keyPoints: [
      '直接压迫是最有效的止血方法（持续至少5分钟）',
      '抬高患肢（无骨折时）至高于心脏',
      '加压包扎松紧以能伸进一指为宜',
      '止血带需记录上带时间，防止肢体缺血坏死',
    ],
    warnings: [
      '伤口内嵌有异物时不要拔出，应在周围加压固定',
      '止血带仅用于大出血且压迫无效时，上带后立即送医',
      '戴手套做好自我防护，避免接触血液',
    ],
    segments: [
      { type: 'manual', title: '自我防护', text: '戴上医用手套，避免直接接触血液，保护自己' },
      { type: 'manual', title: '直接压迫', text: '用无菌纱布/干净布料直接用力按压伤口（真实情况需持续至少5分钟）' },
      { type: 'countdown', title: '持续压迫（练习）', text: '保持按压不松手，本课演示30秒', seconds: 30 },
      { type: 'manual', title: '抬高患肢', text: '确认无骨折后，将受伤肢体抬高至高于心脏，减轻出血' },
      { type: 'manual', title: '加压包扎', text: '用弹性绷带环形缠绕包扎，松紧以能伸进一指为宜' },
      { type: 'manual', title: '仍不止血', text: '大出血且压迫无效时，上止血带（上臂/大腿上1/3处）并记录时间，立即送医' },
    ],
  },
  {
    id: 'burn',
    name: '烧烫伤处理',
    icon: '/subchart/pages/firstaid/icons/burn.png',
    category: '通用急救',
    short: '烧烫伤',
    description: '五步法：冲、脱、泡、盖、送。立即用流动凉水冲洗降温',
    keyPoints: [
      '立即用流动凉水冲洗伤处15-20分钟',
      '五步法：冲 → 脱 → 泡 → 盖 → 送',
      '严重烫伤、面积大或伤及面部/关节/会阴部 → 立即送医',
    ],
    warnings: [
      '严禁涂抹牙膏、酱油、香油等土方！',
      '勿用冰块直接敷（会冻伤），用流动凉水即可',
      '水泡不要挑破，用干净纱布轻轻覆盖',
    ],
    segments: [
      { type: 'countdown', title: '冲', text: '流动凉水冲洗伤处（本课演示60秒；真实需15-20分钟）', seconds: 60 },
      { type: 'manual', title: '脱', text: '轻轻脱去伤处衣物；粘连时勿硬扯，可用剪刀剪开' },
      { type: 'manual', title: '泡', text: '将伤处浸泡在冷水中继续降温（面积大可省略）' },
      { type: 'manual', title: '盖', text: '用无菌纱布/干净布轻轻覆盖，不弄破水泡' },
      { type: 'manual', title: '送', text: '严重烫伤、面积大，或伤及面部/关节/会阴部 → 立即送医' },
    ],
  },
  {
    id: 'sprain',
    name: '扭伤处理',
    icon: '/subchart/pages/firstaid/icons/sprain.png',
    category: '通用急救',
    short: '扭伤 RICE',
    description: 'RICE原则：休息、冰敷、加压、抬高',
    keyPoints: [
      'Rest 休息：立即停止活动，避免负重',
      'Ice 冰敷：每次15-20分钟，间隔1-2小时',
      'Compression 加压：弹性绷带适度包扎',
      'Elevation 抬高：患肢抬至高于心脏',
    ],
    warnings: [
      '冰敷勿直接接触皮肤，需毛巾包裹防冻伤',
      '48小时内勿热敷、勿揉搓',
      '疼痛剧烈、无法承重或关节变形 → 立即就医',
    ],
    segments: [
      { type: 'manual', title: '休息 Rest', text: '立即停止活动，避免伤处负重' },
      { type: 'countdown', title: '冰敷 Ice', text: '毛巾包裹冰袋敷于伤处（每次15-20分钟，本课演示20秒）', seconds: 20 },
      { type: 'manual', title: '加压 Compression', text: '用弹性绷带适度加压包扎，不宜过紧' },
      { type: 'manual', title: '抬高 Elevation', text: '将患肢抬高至高于心脏，减轻肿胀' },
      { type: 'manual', title: '后续处理', text: '48小时内冰敷、之后可热敷；疼痛剧烈/无法承重 → 就医' },
    ],
  },
  {
    id: 'seizure',
    name: '癫痫发作护理',
    icon: '/subchart/pages/firstaid/icons/seizure.png',
    category: '通用急救',
    short: '癫痫发作',
    description: '保护头部、移开危险物、侧卧位、记录时间；发作超5分钟立即拨打120',
    keyPoints: [
      '保护头部，移开周围尖锐/危险物品',
      '发作缓解后置侧卧位，保持呼吸道通畅',
      '记录发作开始时间',
    ],
    warnings: [
      '不要往嘴里塞任何东西（会损伤牙齿和气道）',
      '不要强行按压抽搐的肢体',
      '发作超5分钟、连续发作、首次发作、妊娠或水中发作 → 立即拨打120',
    ],
    segments: [
      { type: 'manual', title: '保护头部', text: '垫软物于头下，移开周围尖锐/危险物品，防止撞伤' },
      { type: 'manual', title: '记录时间', text: '从发作开始计时，便于后续判断是否需要送医' },
      { type: 'manual', title: '陪伴观察', text: '不要强行按压肢体，不要往嘴里塞任何东西' },
      { type: 'manual', title: '侧卧位', text: '发作缓解后置侧卧位，保持呼吸道通畅，清理口周分泌物' },
      { type: 'manual', title: '判断是否拨打120', text: '发作超5分钟、连续发作、首次发作、妊娠或水中发作 → 立即拨打120' },
    ],
  },
  {
    id: 'baby_eczema',
    name: '婴儿湿疹护理',
    icon: '/subchart/pages/firstaid/icons/eczema.png',
    category: '宝宝护理',
    short: '湿疹护理',
    description: '保湿为主：每日厚涂保湿霜、温水短时洗澡、穿纯棉透气衣物',
    keyPoints: [
      '保湿是核心：每天至少2-3次厚涂无香精保湿霜',
      '洗澡水温37℃以下、时间5-10分钟，洗完立即涂保湿',
      '穿纯棉透气衣物，避免过热出汗',
      '指甲剪短，防止抓挠加重',
    ],
    warnings: [
      '中重度湿疹、破溃渗液或反复不愈 → 及时就医，遵医嘱用药',
      '不要自行乱用激素药膏，需医生评估',
      '注意观察是否与特定食物（如牛奶、鸡蛋）相关，但勿自行禁食',
    ],
    segments: [
      { type: 'manual', title: '评估皮肤', text: '观察红斑、丘疹、干燥脱屑范围，判断轻度还是中重度' },
      { type: 'manual', title: '温水洗澡', text: '水温37℃以下，洗澡5-10分钟，不用碱性沐浴露' },
      { type: 'manual', title: '涂抹保湿', text: '洗后3分钟内厚涂保湿霜，重点覆盖干燥粗糙部位' },
      { type: 'countdown', title: '保湿按摩（练习）', text: '打圈轻揉至吸收，本课演示20秒', seconds: 20 },
      { type: 'manual', title: '衣物与指甲', text: '换纯棉宽松衣物，剪短指甲防止抓挠' },
      { type: 'manual', title: '就医指征', text: '破溃渗液、范围扩大、影响睡眠 → 及时就医' },
    ],
  },
  {
    id: 'baby_mosquito',
    name: '防蚊虫叮咬处理',
    icon: '/subchart/pages/firstaid/icons/mosquito.png',
    category: '宝宝护理',
    short: '防蚊处理',
    description: '物理防蚊为主，被叮后冷敷、涂止痒，观察过敏反应',
    keyPoints: [
      '首选物理防蚊：蚊帐、长袖衣裤、纱窗',
      '外出避开清晨傍晚蚊虫高峰，避免去草丛水边',
      '6月龄以下宝宝慎用化学驱蚊剂，选用前先咨询',
      '被叮后：冷敷 + 涂炉甘石洗剂止痒',
    ],
    warnings: [
      '6月龄以下慎用避蚊胺类驱蚊剂，有年龄限制',
      '叮咬处红肿扩散、发热、起水疱 → 及时就医',
      '不要抓挠，防抓破感染',
    ],
    segments: [
      { type: 'manual', title: '物理防蚊', text: '检查蚊帐、纱窗是否完好，给宝宝穿浅色长袖衣裤' },
      { type: 'manual', title: '外出防护', text: '避开清晨傍晚蚊虫高峰，远离草丛、水边、垃圾堆' },
      { type: 'manual', title: '驱蚊剂选择', text: '6月龄以上可选儿童专用驱蚊剂，6月龄以下先咨询医生' },
      { type: 'manual', title: '被叮后处理', text: '先用凉毛巾冷敷，再涂炉甘石洗剂或婴儿止痒膏' },
      { type: 'manual', title: '观察就医', text: '红肿扩散、起疱、发热，或精神差 → 及时就医' },
    ],
  },
  {
    id: 'baby_diaper',
    name: '婴儿红屁屁护理',
    icon: '/subchart/pages/firstaid/icons/choking.png',
    category: '宝宝护理',
    short: '红屁屁',
    description: '勤换尿布、温水清洗、保持干爽、涂护臀膏',
    keyPoints: [
      '勤换尿布，每2-3小时或大便后立即更换',
      '温水清洗后用软布轻轻吸干，不来回擦',
      '每天让屁屁光着晾10-15分钟保持干爽',
      '涂抹护臀膏形成隔离保护膜',
    ],
    warnings: [
      '不要用湿巾反复大力擦拭（刺激皮肤）',
      '不用爽身粉（可能吸入呼吸道）',
      '破皮、溃烂、有白色念珠菌感染表现 → 及时就医',
    ],
    segments: [
      { type: 'manual', title: '勤换尿布', text: '每2-3小时或大便后立即更换，减少尿液粪便刺激' },
      { type: 'manual', title: '温水清洗', text: '用温水冲洗，软布轻轻吸干，避免来回摩擦' },
      { type: 'manual', title: '晾干透气', text: '让屁屁裸露晾10-15分钟（本课演示20秒）', },
      { type: 'countdown', title: '晾干练习', text: '保持宝宝仰卧露出屁屁，本课演示20秒', seconds: 20 },
      { type: 'manual', title: '涂护臀膏', text: '涂一层护臀膏，隔绝尿液刺激，再换上新尿布' },
      { type: 'manual', title: '就医指征', text: '破皮溃烂、水疱、疑似真菌感染 → 及时就医' },
    ],
  },
  {
    id: 'baby_burp',
    name: '婴儿拍嗝/吐奶护理',
    icon: '/subchart/pages/firstaid/icons/milk_choking.png',
    category: '宝宝护理',
    short: '拍嗝护理',
    description: '喂奶后拍嗝防吐奶，掌握正确拍嗝姿势与吐奶处理',
    keyPoints: [
      '喂奶后竖抱，让宝宝头靠在肩上，轻拍背部',
      '拍嗝时间约10-15分钟，直到打出嗝',
      '溢奶/吐奶时立即让宝宝侧卧，防止误吸',
      '喂奶时保持姿势，避免吸入过多空气',
    ],
    warnings: [
      '频繁喷射性吐奶、体重不增、吐黄绿色/带血 → 及时就医',
      '吐奶时不要马上抱起，先侧卧让奶液流出',
      '拍嗝时手呈空心掌，力度轻柔',
    ],
    segments: [
      { type: 'manual', title: '准备姿势', text: '喂奶后竖抱宝宝，头靠肩部，身体稍后仰' },
      { type: 'manual', title: '空心掌拍嗝', text: '空心掌由下往上轻拍宝宝背部（本课演示20秒）' },
      { type: 'countdown', title: '拍嗝练习', text: '配合节奏轻拍背部，本课演示20秒', seconds: 20 },
      { type: 'manual', title: '观察是否打嗝', text: '听到打嗝声即完成；未打出可换侧再拍几分钟' },
      { type: 'manual', title: '吐奶处理', text: '若吐奶立即让宝宝侧卧，清理口鼻，防止呛咳误吸' },
    ],
  },
  {
    id: 'baby_bath',
    name: '婴儿洗澡护理',
    icon: '/subchart/pages/firstaid/icons/bath.png',
    category: '宝宝护理',
    short: '洗澡护理',
    description: '正确水温、安全托扶、洗后保湿，全程不离人',
    keyPoints: [
      '室温26-28℃，水温37-38℃（用手肘试温）',
      '托住宝宝头颈，全程有一只手不离宝宝',
      '洗澡时间5-10分钟，避免过长',
      '洗后立即擦干，涂润肤露保湿',
    ],
    warnings: [
      '洗澡时绝不离开，哪怕一秒钟',
      '浴盆水深5-8cm即可，不要过深',
      '浴霸不要直射宝宝眼睛',
      '脐部未脱落前避开脐部，注意防水',
    ],
    segments: [
      { type: 'manual', title: '准备用品', text: '备好浴盆、温水、毛巾、润肤露、干净衣物' },
      { type: 'manual', title: '试水温', text: '用手肘试水温，37-38℃温热不烫' },
      { type: 'manual', title: '托扶下水', text: '一手托头颈、一手托臀部，从脚开始慢慢入水' },
      { type: 'countdown', title: '清洗练习', text: '用软毛巾轻轻擦洗（本课演示30秒）', seconds: 30 },
      { type: 'manual', title: '擦干保湿', text: '抱出后立即用软毛巾擦干，涂润肤露' },
    ],
  },
  {
    id: 'baby_fever',
    name: '婴儿发热护理',
    icon: '/subchart/pages/firstaid/icons/fever_seizure.png',
    category: '宝宝护理',
    short: '发热护理',
    description: '正确测温、物理降温、观察精神状态；小月龄发热及时就医',
    keyPoints: [
      '用电子体温计测腋温/耳温，判断发热程度',
      '减少衣物散热、多喂奶/喂水补充水分',
      '体温38.5℃以上且不适明显，遵医嘱用退烧药',
      '重点观察宝宝精神状态、进食、尿量',
    ],
    warnings: [
      '3月龄以下宝宝发热（≥38℃）→ 立即就医',
      '精神差、拒奶、抽搐、呼吸急促、皮疹 → 及时就医',
      '不要捂汗、不要酒精擦浴，以免体温骤降或中毒',
    ],
    segments: [
      { type: 'manual', title: '正确测温', text: '用电子体温计测腋温或耳温，记录数值和时间' },
      { type: 'manual', title: '减少散热', text: '解开过多衣物，保持室内通风，温度适宜' },
      { type: 'manual', title: '补充水分', text: '增加喂奶/喂水次数，观察尿量是否正常' },
      { type: 'countdown', title: '物理降温练习', text: '用温水毛巾擦额头、腋下、腹股沟（本课演示30秒）', seconds: 30 },
      { type: 'manual', title: '观察精神状态', text: '精神好、能玩能吃可居家观察；精神差需就医' },
      { type: 'manual', title: '就医指征', text: '小月龄发热、超高热、抽搐、呼吸异常 → 及时就医' },
    ],
  },
  {
    id: 'baby_diaper_change',
    name: '婴儿换尿布',
    icon: '/subchart/pages/firstaid/icons/diaper_change.png',
    category: '宝宝护理',
    short: '换尿布',
    description: '正确换尿布全流程：清洁顺序、晾干、护臀，预防红屁屁与漏尿',
    keyPoints: [
      '备好新尿布、温水棉柔巾/湿巾、护臀膏、隔尿垫',
      '清洁顺序：先擦前侧再擦后侧；女宝务必从前向后擦',
      '清洗后彻底晾干再穿新尿布，预防红屁屁',
      '纸尿裤腰围留一指松紧，整理好防漏侧边',
    ],
    warnings: [
      '换尿布时始终一手扶住宝宝，防止侧翻坠床',
      '男宝擦拭时用干净布盖住尿道口，防尿液喷溅',
      '女宝擦拭必须从前向后，避免肛门细菌污染尿道',
      '大便后立即更换；每2-3小时检查一次',
    ],
    segments: [
      { type: 'manual', title: '准备用品', text: '备好新尿布、温水棉柔巾、护臀膏、隔尿垫，放到触手可及处' },
      { type: 'manual', title: '解开脏尿布', text: '一手托住宝宝双脚踝轻轻提起双腿，解开并抽出脏尿布，卷起丢弃' },
      { type: 'manual', title: '从前向后擦拭', text: '用温水棉柔巾从前向后轻轻擦拭，女宝尤其注意避免污染尿道' },
      { type: 'countdown', title: '晾干练习', text: '保持宝宝仰卧，让屁屁彻底晾干（本课演示20秒）', seconds: 20 },
      { type: 'manual', title: '涂护臀膏', text: '薄涂一层护臀膏形成隔离保护膜，再准备穿新尿布' },
      { type: 'manual', title: '穿新尿布', text: '提起双腿放入新尿布，腰围留一指松紧，翻好防漏侧边' },
      { type: 'manual', title: '收尾观察', text: '穿好衣物，检查松紧合适；大便后立即换，预防红屁屁' },
    ],
  },
  {
    id: 'baby_hold',
    name: '按月龄抱宝宝',
    icon: '/subchart/pages/firstaid/icons/hold.png',
    category: '宝宝护理',
    short: '抱姿护理',
    description: '0-3月横抱、3-6月短竖抱、6月+坐式抱法，全程护住头颈腰臀',
    keyPoints: [
      '0-3月：横抱为主，始终托住头颈和腰臀（头颈无支撑力）',
      '3-6月：可短时间竖抱，头靠肩、一手托头颈一手托臀',
      '6月+：可面向前坐式抱法，仍要支撑腰背',
      '抱起/放下动作缓慢，贴近身体再离身',
    ],
    warnings: [
      '新生儿颈部非常脆弱，严禁剧烈摇晃',
      '竖抱时间不宜过长，观察宝宝状态是否舒适',
      '双手一定要托实，尤其头颈部位不能悬空',
    ],
    segments: [
      { type: 'manual', title: '月龄判断', text: '先判断宝宝月龄：0-3月选横抱、3-6月可短竖抱、6月+可坐式抱法' },
      { type: 'manual', title: '0-3月横抱', text: '头颈枕于大人手臂弯，另一手托住腰臀，宝宝身体贴近胸口' },
      { type: 'countdown', title: '横抱练习', text: '保持托扶姿势，感受头颈与腰臀的支撑（本课演示20秒）', seconds: 20 },
      { type: 'manual', title: '3-6月竖抱', text: '宝宝头靠大人肩部，一手托头颈、一手托臀部，身体贴紧' },
      { type: 'countdown', title: '竖抱练习', text: '保持竖抱姿势，护好头颈（本课演示20秒）', seconds: 20 },
      { type: 'manual', title: '6月+坐式抱法', text: '宝宝面向前坐在大人臂弯，一手环抱胸腹支撑腰背' },
      { type: 'manual', title: '放下要领', text: '贴近床面缓慢放下，先放臀部再放头部，动作轻柔' },
    ],
  },
  {
    id: 'baby_cord',
    name: '新生儿脐带护理',
    icon: '/subchart/pages/firstaid/icons/cord.png',
    category: '宝宝护理',
    short: '脐带护理',
    description: '脐带脱落前（约出生后1-2周）的每日消毒护理，预防脐炎',
    keyPoints: [
      '每天1-2次用75%酒精或碘伏，由内向外消毒',
      '保持脐部干燥透气，尿布上缘下折避免摩擦',
      '洗澡时用防水贴或避开脐部，洗后立即擦干消毒',
      '脐带一般出生后1-2周自然脱落，勿强行拉扯',
    ],
    warnings: [
      '脐周红肿、渗液、异味、出血不止 → 立即就医',
      '不要用爽身粉、香油等涂抹脐部',
      '不要强行拉扯脐带，让其自然脱落',
    ],
    segments: [
      { type: 'manual', title: '准备用品', text: '备好75%酒精/碘伏、无菌棉签，洗净双手' },
      { type: 'manual', title: '暴露脐部', text: '轻轻提起脐带暴露根部，注意给宝宝保暖' },
      { type: 'manual', title: '由内向外消毒', text: '棉签蘸消毒液，从脐带根部中心向外画圈消毒' },
      { type: 'countdown', title: '消毒练习', text: '沿根部中心向外轻轻消毒（本课演示20秒）', seconds: 20 },
      { type: 'manual', title: '保持干燥', text: '尿布上缘下折，露出脐部透气，避免摩擦' },
      { type: 'manual', title: '观察就医', text: '红肿、渗液、异味、出血不止 → 及时就医' },
    ],
  },
  {
    id: 'baby_massage',
    name: '婴儿抚触按摩',
    icon: '/subchart/pages/firstaid/icons/massage.png',
    category: '宝宝护理',
    short: '抚触按摩',
    description: '促进亲子连接与发育的抚触：头面、胸腹、四肢、背部顺序',
    keyPoints: [
      '宝宝清醒、饭后1小时进行，室温26-28℃',
      '顺序：头面→胸腹→四肢→背部，手法轻柔',
      '涂抹婴儿润肤油减少摩擦',
      '宝宝哭闹拒绝时暂停，不强迫',
    ],
    warnings: [
      '肚脐未脱落时避开脐部',
      '手法力度要轻，随时观察宝宝表情',
      '发烧、皮肤破损时暂停抚触',
    ],
    segments: [
      { type: 'manual', title: '准备环境', text: '室温26-28℃，铺软垫，倒润肤油于手心搓热' },
      { type: 'manual', title: '头面抚触', text: '眉心向两侧、脸颊画小圈轻抚，避开囟门' },
      { type: 'manual', title: '胸部抚触', text: '胸前交叉画圈轻抚，避开乳头' },
      { type: 'manual', title: '腹部抚触', text: '顺时针轻轻揉腹部，避开脐部' },
      { type: 'countdown', title: '腹部抚触练习', text: '顺时针轻柔画圈（本课演示20秒）', seconds: 20 },
      { type: 'manual', title: '四肢抚触', text: '捏揉四肢，从根部向末端轻轻推抚' },
      { type: 'manual', title: '背部抚触', text: '宝宝俯卧，沿脊柱两侧从上往下轻抚' },
      { type: 'manual', title: '结束观察', text: '观察宝宝反应，哭闹或不适立即停止' },
    ],
  },
  {
    id: 'baby_fever',
    name: '发烧降温处理',
    icon: '/subchart/pages/firstaid/icons/fever_seizure.png',
    category: '宝宝护理',
    short: '低烧与高烧处理',
    description: '低烧物理降温、高烧药物退热与用药指南、就医指征：安全降温不捂汗',
    keyPoints: [
      '腋温 ≥37.5℃ 为发热；37.5-38.4℃ 低热可先物理降温，38.5℃ 以上且不适可药物退热',
      '低热处理：减衣物、温水擦浴、多喂水，观察精神状态',
      '高热用药：对乙酰氨基酚（≥3月龄）每次10-15mg/kg，4-6小时1次，24h≤4次；布洛芬（≥6月龄）每次5-10mg/kg，6-8小时1次，24h≤4次',
      '严禁酒精擦浴与捂汗；不自行给 3 月龄以下宝宝用药',
    ],
    warnings: [
      '对乙酰氨基酚过量伤肝、布洛芬过量伤肾，务必按体重与间隔用药',
      '两种退烧药不建议自行交替或同时服用，除非医生明确指导',
      '严禁给婴幼儿使用阿司匹林（可能诱发瑞氏综合征）',
      '用药后退热不佳或反复高热，及时就医',
    ],
    segments: [
      { type: 'manual', title: '确认发热', text: '用水银/电子体温计测腋温，≥37.5℃ 为发热；先看宝宝精神状态和吃奶情况' },
      { type: 'manual', title: '低烧处理（37.5-38.4℃）', text: '减少衣物、开窗通风，用 37℃ 左右温水毛巾擦颈部、腋下、腹股沟；多喂温水/母乳' },
      { type: 'manual', title: '低烧观察', text: '宝宝精神好、能吃能玩 → 居家观察，每 4-6 小时复测体温；不急于用药' },
      { type: 'manual', title: '高烧用药前确认', text: '体温 ≥38.5℃ 且宝宝明显不适（哭闹、烦躁、精神差）才考虑药物退热' },
      { type: 'manual', title: '对乙酰氨基酚用法', text: '≥3月龄：每次 10-15mg/kg（如6kg宝宝约60-90mg），每4-6小时1次，24小时内≤4次' },
      { type: 'manual', title: '布洛芬用法', text: '≥6月龄：每次 5-10mg/kg（如8kg宝宝约40-80mg），每6-8小时1次，24小时内≤4次' },
      { type: 'manual', title: '用药禁忌', text: '严禁酒精擦浴、严禁捂汗发汗；不用阿司匹林；两种退烧药不自行交替；3月龄以下不用药直接就医' },
      { type: 'manual', title: '补水与监测', text: '退热期间多喂水/母乳防止脱水，勤测体温，观察精神、呼吸、皮疹' },
      { type: 'manual', title: '就医指征', text: '3月龄以下发热、持续高热>72小时、抽搐、精神萎靡嗜睡、呼吸急促、拒奶脱水、皮疹瘀点 → 立即就医' },
    ],
  },
  {
    id: 'postpartum_kegel',
    name: '家庭凯格尔训练',
    icon: '/subchart/pages/firstaid/icons/meditation.png',
    category: '产后护理',
    short: '凯格尔',
    description: '盆底肌锻炼：收缩5秒放松5秒，10次/组，每天3组',
    startAfter: '顺产产后即可开始（产后1周后更佳）；剖腹产建议产后6周复查后开始；若有疼痛先咨询医生',
    keyPoints: [
      '收缩盆底肌（像忍住小便/放屁的感觉），保持5秒',
      '放松5秒，再重复，10次为一组',
      '每天3组，可在喂奶、看电视时练习',
      '坚持4-8周可见效果',
    ],
    warnings: [
      '练习前排空膀胱',
      '不要憋气、不要收紧腹部和臀部代偿',
      '盆底高张/疼痛时不要强行训练，先咨询康复师',
    ],
    segments: [
      { type: 'manual', title: '确认起始时间', text: '确认适合开始（顺产产后1周后/剖腹产产后6周后），排空膀胱' },
      { type: 'manual', title: '找到盆底肌', text: '尝试中断小便的感觉，或用镜子观察会阴上提' },
      {
        type: 'cycle', rounds: 5, label: '组',
        children: [
          { type: 'countdown', title: '收缩保持', text: '收紧盆底肌，保持5秒（不要憋气）', seconds: 5 },
          { type: 'countdown', title: '放松', text: '完全放松5秒', seconds: 5 },
        ],
      },
      { type: 'manual', title: '完成一组', text: '已练5组，建议每天3组，坚持4-8周见效' },
    ],
  },
  {
    id: 'postpartum_glute',
    name: '产后提臀训练',
    icon: '/subchart/pages/firstaid/icons/peach.png',
    category: '产后护理',
    short: '提臀桥',
    description: '臀桥训练：仰卧屈膝抬臀，激活臀肌、缓解腰背负担',
    startAfter: '顺产产后2周后可尝试；剖腹产建议产后6周复查后开始',
    keyPoints: [
      '仰卧屈膝，双脚踩地，与肩同宽',
      '收紧臀部发力抬起，身体呈一条直线',
      '保持2-3秒缓慢放下，10-15次/组',
      '动作缓慢，配合呼气发力',
    ],
    warnings: [
      '腰部不适时减小幅度，不要用腰代偿',
      '剖腹产伤口未愈时避免牵拉',
      '如疼痛明显、恶露异常增多 → 停止并咨询医生',
    ],
    segments: [
      { type: 'manual', title: '确认起始时间', text: '确认适合开始（顺产2周后/剖腹产6周后）' },
      { type: 'manual', title: '仰卧准备', text: '仰卧，屈膝双脚踩地与肩同宽，双手放体侧' },
      {
        type: 'cycle', rounds: 3, label: '组',
        children: [
          { type: 'press', title: '提臀抬起', text: '收紧臀部抬起，保持2秒后放下', count: 10, bpm: 60 },
          { type: 'manual', title: '组间休息', text: '放松10秒，调整呼吸' },
        ],
      },
      { type: 'manual', title: '完成训练', text: '已练3组，每天1-2次，坚持可见效果' },
    ],
  },
  {
    id: 'postpartum_abs',
    name: '产后收腹训练',
    icon: '/subchart/pages/firstaid/icons/muscle.png',
    category: '产后护理',
    short: '收腹训练',
    description: '腹式呼吸+骨盆活动激活深层腹肌，先自查腹直肌再训练',
    startAfter: '产后6周后开始为宜；腹直肌分离超2指者，建议先咨询康复师再训练',
    keyPoints: [
      '先自查腹直肌分离情况（2指内为宜）',
      '腹式呼吸：吸气鼓腹、呼气收腹内收',
      '配合骨盆后倾、凯格尔同步练习',
      '循序渐进，避免卷腹和仰卧起坐',
    ],
    warnings: [
      '腹直肌分离明显时避免卷腹、仰卧起坐、搬重物',
      '训练时腰部贴地，避免腰部代偿',
      '出现疼痛、头晕、恶露异常 → 停止并咨询',
    ],
    segments: [
      { type: 'manual', title: '自查腹直肌', text: '仰卧屈膝，抬头看肚脐，手指探入腹白线测分离宽度' },
      { type: 'manual', title: '腹式呼吸', text: '吸气时腹部鼓起，呼气时腹部内收贴向脊柱' },
      {
        type: 'cycle', rounds: 5, label: '组',
        children: [
          { type: 'countdown', title: '收腹呼吸', text: '呼气收腹，感受腹肌内收，保持5秒', seconds: 5 },
          { type: 'countdown', title: '放松吸气', text: '吸气放松，自然呼吸5秒', seconds: 5 },
        ],
      },
      { type: 'manual', title: '完成训练', text: '每天2-3组腹式呼吸，配合凯格尔，逐步恢复核心' },
    ],
  },
  {
    id: 'postpartum_lochia',
    name: '产后恶露观察',
    icon: '/subchart/pages/firstaid/icons/blood.png',
    category: '产后护理',
    short: '恶露观察',
    description: '观察恶露颜色/量/气味变化，识别异常及时就医',
    startAfter: '产后即可开始，持续观察至恶露完全干净（一般4-6周）',
    keyPoints: [
      '恶露颜色变化：血性(红)→浆液性(淡红)→白色，一般4-6周干净',
      '勤换卫生巾，每天温水清洗外阴，保持干爽',
      '观察恶露量、颜色、气味变化',
    ],
    warnings: [
      '恶露量突然增多、有大血块、气味恶臭 → 及时就医',
      '1小时内湿透整片卫生巾提示出血量过大',
      '伴随发热、腹痛、头晕心慌 → 立即就医',
    ],
    segments: [
      { type: 'manual', title: '认识恶露', text: '恶露是产后子宫恢复排出的分泌物，颜色由红逐渐变淡' },
      { type: 'manual', title: '观察颜色', text: '产后3-4天血性红、约1周浆液淡红、之后白色，逐日变淡' },
      { type: 'manual', title: '观察量与气味', text: '量应逐渐减少，无腥臭异味；勤换卫生巾并记录' },
      { type: 'manual', title: '会阴护理', text: '每天温水清洗外阴2次，从前向后擦，保持干燥' },
      { type: 'manual', title: '异常就医', text: '量骤增、大血块、恶臭、发热腹痛 → 立即就医' },
    ],
  },
  {
    id: 'postpartum_csection',
    name: '剖腹产伤口护理',
    icon: '/subchart/pages/firstaid/icons/scissors.png',
    category: '产后护理',
    short: '伤口护理',
    description: '保持伤口清洁干燥，观察愈合，避免牵拉感染',
    startAfter: '产后即可开始，持续至伤口完全愈合（一般1-2周表皮愈合）',
    keyPoints: [
      '保持伤口及敷料清洁干燥，遵医嘱按时换药',
      '观察伤口有无红、肿、热、痛、渗液',
      '避免提重物、剧烈咳嗽时按住伤口',
      '结痂自然脱落，不要抠',
    ],
    warnings: [
      '伤口红肿热痛加重、渗液脓性、发热 → 及时就医',
      '敷料渗湿及时更换并告知医护人员',
      '洗澡遵医嘱，伤口未愈时避免沾水',
    ],
    segments: [
      { type: 'manual', title: '保持干燥', text: '保持伤口和敷料干燥，出汗后及时擦干' },
      { type: 'manual', title: '观察愈合', text: '每天检查伤口有无红肿、渗液、裂开' },
      { type: 'manual', title: '避免牵拉', text: '咳嗽、打喷嚏时用手轻按伤口，避免提重物' },
      { type: 'manual', title: '按时换药', text: '遵医嘱换药，结痂让它自然脱落' },
      { type: 'manual', title: '异常就医', text: '红肿热痛加重、脓性渗液、发热 → 及时就医' },
    ],
  },
  {
    id: 'postpartum_breast',
    name: '哺乳期堵奶/乳房护理',
    icon: '/subchart/pages/firstaid/icons/hold.png',
    category: '产后护理',
    short: '堵奶护理',
    description: '勤排空、温敷冷敷、正确按摩；识别乳腺炎及时就医',
    startAfter: '哺乳期全程适用',
    keyPoints: [
      '按需亲喂，勤排空乳房，避免长时间涨奶',
      '喂奶前温热敷、喂奶后冷敷缓解胀痛',
      '从堵奶硬块处向乳头方向轻柔按摩',
      '宝宝下巴对准硬块方向吸吮效果更好',
    ],
    warnings: [
      '乳房红肿热痛伴发热、寒战、全身不适 → 疑似乳腺炎，及时就医',
      '不要暴力按揉，以免损伤乳腺',
      '乳头皲裂及时处理，保持乳晕清洁',
    ],
    segments: [
      { type: 'manual', title: '勤排空', text: '按需亲喂，两侧轮流，避免涨奶积存' },
      { type: 'manual', title: '喂前温敷', text: '喂奶前温敷乳房3-5分钟，促进乳汁流出' },
      { type: 'manual', title: '轻柔按摩', text: '从硬块处向乳头方向轻轻打圈按摩（本课演示20秒）' },
      { type: 'countdown', title: '按摩练习', text: '配合轻柔手法按摩，本课演示20秒', seconds: 20 },
      { type: 'manual', title: '喂后冷敷', text: '喂奶后冷敷乳房10分钟，缓解胀痛水肿' },
      { type: 'manual', title: '识别乳腺炎', text: '红肿热痛伴发热 → 及时就医，不要硬扛' },
    ],
  },
  {
    id: 'postpartum_mood',
    name: '产后情绪关注',
    icon: '/subchart/pages/firstaid/icons/love.png',
    category: '产后护理',
    short: '情绪关怀',
    description: '识别产后情绪波动与产后抑郁，学会自我调节与求助',
    startAfter: '产后即可开始，产后2周至1年内均需关注',
    keyPoints: [
      '产后情绪波动（爱哭、焦虑）多为激素变化，多可自行缓解',
      '保证睡眠、适当活动、向家人朋友倾诉',
      '情绪低落持续2周以上、影响生活 → 及时就医',
      '家人多理解支持，分担照顾任务',
    ],
    warnings: [
      '出现伤害自己或宝宝的想法 → 立即寻求专业帮助/拨打心理援助热线',
      '产后抑郁是疾病，不是"想开点"就能好',
      '严重失眠、食欲体重显著变化、失去兴趣 → 及时就医',
    ],
    segments: [
      { type: 'manual', title: '识别情绪', text: '区分产后情绪波动（短暂）与持续低落的产后抑郁' },
      { type: 'manual', title: '保证休息', text: '尽量抓住碎片时间休息，让家人分担夜奶和家务' },
      { type: 'manual', title: '倾诉支持', text: '向配偶、家人、朋友倾诉，主动表达需求' },
      { type: 'manual', title: '自我调节', text: '每天留一点属于自己的时间，散步、听音乐' },
      { type: 'manual', title: '求助信号', text: '低落持续2周以上或出现伤害念头 → 立即就医求助' },
    ],
  },
  {
    id: 'heatstroke',
    name: '中暑急救',
    icon: '/subchart/pages/firstaid/icons/hot_face.png',
    category: '通用急救',
    short: '中暑',
    description: '移至阴凉、快速降温、补充水分；重症中暑立即就医',
    keyPoints: [
      '迅速转移到阴凉通风处，解开衣物散热',
      '用凉毛巾/冰袋敷额头、颈部、腋下、腹股沟降温',
      '意识清醒可少量多次喝淡盐水/运动饮料',
      '体温持续升高、意识模糊 → 立即就医',
    ],
    warnings: [
      '不要一次性大量灌水，防水中毒',
      '不要用酒精擦浴降温',
      '中暑高热、抽搐、昏迷 → 立即拨打120',
    ],
    segments: [
      { type: 'manual', title: '转移到阴凉处', text: '立即把患者移到阴凉通风处，平卧、解开衣扣' },
      { type: 'manual', title: '物理降温', text: '凉毛巾/冰袋敷额头、颈部、腋下、腹股沟等大血管处' },
      { type: 'countdown', title: '降温观察（练习）', text: '持续物理降温并观察，本课演示30秒', seconds: 30 },
      { type: 'manual', title: '补充水分', text: '意识清醒者少量多次喝淡盐水或运动饮料' },
      { type: 'manual', title: '判断就医', text: '体温仍高、意识模糊、抽搐 → 立即拨打120' },
    ],
  },
  {
    id: 'adult_drowning',
    name: '成人溺水急救',
    icon: '/subchart/pages/firstaid/icons/wave.png',
    category: '通用急救',
    short: '溺水急救',
    description: '安全救离、清理口鼻、检查呼吸；无呼吸立即CPR并拨打120',
    keyPoints: [
      '先确保自身安全，用工具救离，勿盲目下水',
      '救上岸后清理口鼻异物，开放气道',
      '检查呼吸：无呼吸立即开始心肺复苏(CPR)',
      '溺水后即使恢复也要送医观察24小时',
    ],
    warnings: [
      '救人时注意自身安全，防止二次溺水',
      '不要先倒挂控水，会延误心肺复苏',
      '无呼吸无脉搏 → 立即CPR并拨打120',
    ],
    segments: [
      { type: 'manual', title: '安全救离', text: '用竹竿、绳索、救生圈等工具施救，避免直接下水' },
      { type: 'manual', title: '清理口鼻', text: '救上岸后侧头清理口鼻泥沙、水草，开放气道' },
      { type: 'manual', title: '检查呼吸', text: '观察胸廓起伏5-10秒，判断有无呼吸' },
      { type: 'press', title: '心肺复苏按压30次', text: '无呼吸则开始胸外按压，30次后人工呼吸2次（本课演示按压节奏）', count: 30, bpm: 110 },
      { type: 'manual', title: '拨打120', text: '持续CPR，直到救护车到达；恢复呼吸后侧卧保暖送医' },
    ],
  },
  {
    id: 'electric_shock',
    name: '触电急救',
    icon: '/subchart/pages/firstaid/icons/bolt.png',
    category: '通用急救',
    short: '触电',
    description: '先断电脱离电源、确保自身安全；无呼吸立即CPR',
    keyPoints: [
      '立即切断电源或挑开电线，确认无电再接触',
      '用干燥木棍/绝缘物使伤员脱离电源',
      '不要直接用手拉触电者',
      '无呼吸无脉搏 → 立即CPR并拨打120',
    ],
    warnings: [
      '救援前务必确认已断电，防止自己触电',
      '不要在潮湿环境赤手碰触',
      '即使症状轻也要就医检查（可能有内脏/心律损伤）',
    ],
    segments: [
      { type: 'manual', title: '切断电源', text: '立即关闭电源开关或拔掉插头，确认断电' },
      { type: 'manual', title: '挑开电线', text: '用干燥木棍、塑料等绝缘物挑开电线，不直接用手' },
      { type: 'manual', title: '检查意识呼吸', text: '轻拍呼唤判断意识，观察有无呼吸' },
      { type: 'press', title: '心肺复苏按压30次', text: '无呼吸则开始胸外按压30次（本课演示按压节奏）', count: 30, bpm: 110 },
      { type: 'manual', title: '拨打120', text: '持续CPR并拨打120；症状轻者也需就医检查' },
    ],
  },
  {
    id: 'fracture',
    name: '骨折固定',
    icon: '/subchart/pages/firstaid/icons/bone.png',
    category: '通用急救',
    short: '骨折固定',
    description: '先制动固定、冷敷止痛；开放性骨折先止血再固定',
    keyPoints: [
      '先固定受伤肢体，不轻易搬动',
      '用夹板/硬纸板固定骨折上下两个关节',
      '固定松紧以能伸进一指为宜，不压迫神经血管',
      '开放性骨折先止血包扎，再固定',
    ],
    warnings: [
      '不要试图把骨折复位、不要用力拉扯',
      '肢体发麻、发白、发凉说明固定过紧，需放松',
      '疑似脊柱/颈部骨折 → 不要随意搬动，等待专业救援',
    ],
    segments: [
      { type: 'manual', title: '制动', text: '让伤员保持舒适体位，受伤肢体不要活动' },
      { type: 'manual', title: '止血', text: '开放性骨折先压迫止血、包扎伤口，异物不要拔出' },
      { type: 'manual', title: '夹板固定', text: '用夹板/硬纸板/健肢固定，固定骨折处上下两个关节' },
      { type: 'countdown', title: '固定检查（练习）', text: '检查松紧和末梢血运，本课演示20秒', seconds: 20 },
      { type: 'manual', title: '送医', text: '固定后尽快送医；脊柱伤等待专业救援' },
    ],
  },
  {
    id: 'nosebleed',
    name: '鼻出血处理',
    icon: '/subchart/pages/firstaid/icons/nose.png',
    category: '通用急救',
    short: '鼻出血',
    description: '坐姿前倾、捏紧鼻翼、冷敷鼻根；持续不止及时就医',
    keyPoints: [
      '坐直身体、头前倾，不要后仰（防血液倒流）',
      '用拇指和食指捏紧两侧鼻翼10分钟',
      '冷敷鼻根和前额帮助收缩血管',
      '出血不止、量大或反复 → 及时就医',
    ],
    warnings: [
      '不要仰头、不要塞纸团（可能再次损伤）',
      '血液流入咽喉要吐出，不要吞咽',
      '有高血压、血液病或出血超20分钟 → 及时就医',
    ],
    segments: [
      { type: 'manual', title: '坐姿前倾', text: '坐直身体，头稍前倾，让血液流出' },
      { type: 'manual', title: '捏紧鼻翼', text: '拇指和食指捏紧两侧鼻翼（本课演示10秒）' },
      { type: 'countdown', title: '捏鼻持续（练习）', text: '保持捏紧10分钟，本课演示20秒', seconds: 20 },
      { type: 'manual', title: '冷敷', text: '用凉毛巾/冰袋敷鼻根和前额，帮助止血' },
      { type: 'manual', title: '判断就医', text: '出血超20分钟、量大或反复出血 → 及时就医' },
    ],
  },
  {
    id: 'animal_bite',
    name: '动物咬伤处理',
    icon: '/subchart/pages/firstaid/icons/dog.png',
    category: '通用急救',
    short: '动物咬伤',
    description: '冲洗消毒伤口、止血包扎；犬猫咬伤需评估狂犬病风险',
    keyPoints: [
      '用流动清水+肥皂水冲洗伤口至少15分钟',
      '冲洗后用碘伏消毒，视出血情况加压包扎',
      '犬猫咬伤/抓伤 → 尽快就医评估是否需要狂犬疫苗',
      '记录咬人动物情况，便于后续处置',
    ],
    warnings: [
      '不要用嘴吸吮伤口',
      '伤口深、面积大、出血不止 → 及时就医',
      '被流浪动物、野生动物咬伤 → 立即就医',
    ],
    segments: [
      { type: 'manual', title: '冲洗伤口', text: '流动清水+肥皂水冲洗伤口至少15分钟（本课演示30秒）' },
      { type: 'countdown', title: '冲洗练习', text: '持续冲洗伤口，本课演示30秒', seconds: 30 },
      { type: 'manual', title: '消毒止血', text: '冲洗后碘伏消毒，出血明显则加压包扎' },
      { type: 'manual', title: '评估就医', text: '犬猫咬伤、伤口深或野生动物咬伤 → 立即就医' },
      { type: 'manual', title: '记录动物', text: '记录咬人动物及注射疫苗情况，便于后续处置' },
    ],
  },
]

/** 分类顺序 */
const CATEGORIES = ['宝宝护理', '婴儿急救', '成人急救', '产后护理', '通用急救']

/**
 * 首页四大模块：宝宝护理 / 婴儿急救 / 妈妈护理 / 通用
 * 每个模块聚合若干原分类，用于首页聚合卡片、模块细分页与急救包
 */
const MODULES = [
  {
    key: 'baby_care',
    name: '宝宝护理',
    icon: '/subchart/pages/firstaid/icons/eczema.png',
    tagline: '日常护理',
    categories: ['宝宝护理'],
    accent: '#FFD95A',
  },
  {
    key: 'baby_emergency',
    name: '婴儿急救',
    icon: '/subchart/pages/firstaid/icons/ambulance.png',
    tagline: '救命技能',
    categories: ['婴儿急救'],
    accent: '#FFD95A',
  },
  {
    key: 'mama',
    name: '妈妈护理',
    icon: '/subchart/pages/firstaid/icons/hold.png',
    tagline: '产后护理与康复',
    categories: ['产后护理'],
    accent: '#FFD95A',
  },
  {
    key: 'general',
    name: '通用',
    icon: '/subchart/pages/firstaid/icons/bleeding.png',
    tagline: '成人急救与通用急救',
    categories: ['成人急救', '通用急救'],
    accent: '#FFD95A',
  },
]

/** 获取某模块下的技能列表 */
function getModuleSkills(moduleKey) {
  const mod = MODULES.find(m => m.key === moduleKey)
  if (!mod) return []
  return SKILLS.filter(s => mod.categories.indexOf(s.category) >= 0)
}

/** 用户自学录制视频技能（record 页发布，类型=宝宝护理/婴儿急救/妈妈护理/成人急救/通用急救） */
const USER_POSTS_KEY = 'firstaid_video_posts'
const TYPE_CAT_MAP = { '妈妈护理': '产后护理' }

function getUserSkills() {
  let posts = []
  try { posts = wx.getStorageSync(USER_POSTS_KEY) || [] } catch (e) {}
  return posts.map(p => ({
    id: 'usr_' + p.id,
    name: p.title,
    icon: '/subchart/pages/firstaid/icons/video.png',
    description: p.desc || p.typeLabel || '自学录制的教学视频',
    category: TYPE_CAT_MAP[p.type] || p.type,
    videoUrl: p.videoPath,
    videoTitle: p.title,
    isUserPost: true,
  }))
}

/** 通过 id 查找技能（含用户录制技能，构造可跟做的虚拟技能） */
function getSkillById(id) {
  return SKILLS.find(s => s.id === id) || (id && id.indexOf('usr_') === 0 ? getUserSkillById(id) : null)
}

function getUserSkillById(id) {
  const p = getUserSkills().find(u => u.id === id)
  if (!p) return null
  return {
    ...p,
    keyPoints: [],
    warnings: [],
    segments: [{ type: 'manual', title: '观看教学视频', text: p.description || '观看上方教学视频，掌握操作要点后完成跟做。' }],
  }
}

/** 展开 cycle 段为线性步骤列表（供跟做引擎使用） */
function flattenSkill(skill) {
  const steps = []
  skill.segments.forEach(seg => {
    if (seg.type === 'cycle') {
      for (let r = 1; r <= seg.rounds; r++) {
        seg.children.forEach(child => {
          steps.push({
            ...child,
            cycleRound: r,
            cycleTotal: seg.rounds,
            cycleLabel: seg.label || '轮',
          })
        })
      }
    } else {
      steps.push({ ...seg })
    }
  })
  return steps
}

/**
 * 真人教学指导视频接入表（skillId → 视频信息）
 *
 * 【如何接入真实教学视频】
 * 把真人教学视频上传到可公网访问的 https 地址（如腾讯云 COS / 阿里云 OSS / 微信云开发存储），
 * 将 mp4 直链填入对应技能的 url 字段即可。小程序准备页会自动优先播放该视频；
 * url 为空时显示"教学视频待添加"占位，并保留原有跟做动画作为兜底教学。
 *
 * - url    : 视频 mp4 直链（https），为空则显示占位
 * - title  : 播放器标题
 * - source : 视频来源/版权说明（如"自制"、"某医院授权"、"红十字会素材"）
 */
const VIDEO_MAP = {
  adult_cpr:            { url: '', title: '成人心肺复苏·真人教学', source: '' },
  adult_heimlich:       { url: '', title: '成人海姆立克·真人教学', source: '' },
  bleeding:             { url: '', title: '止血包扎·真人教学', source: '' },
  burn:                 { url: '', title: '烧烫伤处理·真人教学', source: '' },
  sprain:               { url: '', title: '扭伤处理RICE·真人教学', source: '' },
  seizure:              { url: '', title: '癫痫发作护理·真人教学', source: '' },
  heatstroke:           { url: '', title: '中暑急救·真人教学', source: '' },
  adult_drowning:       { url: '', title: '成人溺水急救·真人教学', source: '' },
  electric_shock:       { url: '', title: '触电急救·真人教学', source: '' },
  fracture:             { url: '', title: '骨折固定·真人教学', source: '' },
  nosebleed:            { url: '', title: '鼻出血处理·真人教学', source: '' },
  animal_bite:          { url: '', title: '动物咬伤处理·真人教学', source: '' },
  infant_choking:       { url: '', title: '婴儿气道梗阻·真人教学', source: '' },
  infant_cpr:           { url: '', title: '婴儿心肺复苏·真人教学', source: '' },
  infant_fall:          { url: '', title: '婴儿坠床/头部撞击·真人教学', source: '' },
  infant_fever_seizure: { url: '', title: '婴儿热性惊厥·真人教学', source: '' },
  infant_milk_choking:  { url: '', title: '婴儿呛奶/吐奶·真人教学', source: '' },
  infant_swallow:       { url: '', title: '婴儿误吞异物·真人教学', source: '' },
  infant_drowning:      { url: '', title: '婴儿溺水/呛水·真人教学', source: '' },
  baby_eczema:          { url: '', title: '婴儿湿疹护理·真人教学', source: '' },
  baby_mosquito:        { url: '', title: '防蚊虫叮咬处理·真人教学', source: '' },
  baby_diaper:          { url: '', title: '婴儿红屁屁护理·真人教学', source: '' },
  baby_diaper_change:   { url: '', title: '婴儿换尿布·真人教学', source: '' },
  baby_hold:            { url: '', title: '按月龄抱宝宝·真人教学', source: '' },
  baby_cord:            { url: '', title: '新生儿脐带护理·真人教学', source: '' },
  baby_massage:         { url: '', title: '婴儿抚触按摩·真人教学', source: '' },
  baby_burp:            { url: '', title: '婴儿拍嗝/吐奶护理·真人教学', source: '' },
  baby_bath:            { url: '', title: '婴儿洗澡护理·真人教学', source: '' },
  baby_fever:           { url: '', title: '婴儿发热护理·真人教学', source: '' },
  postpartum_kegel:     { url: '', title: '家庭凯格尔训练·真人教学', source: '' },
  postpartum_glute:     { url: '', title: '产后提臀训练·真人教学', source: '' },
  postpartum_abs:       { url: '', title: '产后收腹训练·真人教学', source: '' },
  postpartum_lochia:    { url: '', title: '产后恶露观察·真人教学', source: '' },
  postpartum_csection:  { url: '', title: '剖腹产伤口护理·真人教学', source: '' },
  postpartum_breast:    { url: '', title: '哺乳期堵奶/乳房护理·真人教学', source: '' },
  postpartum_mood:      { url: '', title: '产后情绪关注·真人教学', source: '' },
}

/* =========================================================
 * 英文显示层（中文数据层保持不变）
 * 技能正文见 skills-en.js，按 SKILLS 的 index 一一对齐
 * ========================================================= */
const SKILLS_EN = require('./skills-en')

const CATEGORY_EN = {
  '宝宝护理': 'Baby Care',
  '婴儿急救': 'Infant First Aid',
  '成人急救': 'Adult First Aid',
  '产后护理': 'Postpartum Care',
  '通用急救': 'General First Aid',
}

const MODULE_EN = {
  baby_care: { name: 'Baby Care', tagline: 'Daily care' },
  baby_emergency: { name: 'Infant First Aid', tagline: 'Life-saving skills' },
  mama: { name: 'Mom Care', tagline: 'Postpartum care & recovery' },
  general: { name: 'General', tagline: 'Adult & general first aid' },
}

/** 当前语言（'zh' | 'en'） */
function currentLang() {
  try {
    return (wx.getStorageSync('lang') || 'zh') === 'en' ? 'en' : 'zh'
  } catch (e) {
    return 'zh'
  }
}

/** 技能在 SKILLS 中的下标（用户录制技能返回 -1） */
function indexOfSkill(skill) {
  return skill ? SKILLS.indexOf(skill) : -1
}

/** segments 按 index 对齐合并：节奏参数取中文层，文案取英文层 */
function localizeSegments(zhSegs, enSegs) {
  if (!enSegs) return zhSegs
  return (zhSegs || []).map((seg, i) => {
    const t = enSegs[i] || {}
    const out = Object.assign({}, seg)
    if (t.title) out.title = t.title
    if (t.text) out.text = t.text
    if (t.label) out.label = t.label
    if (seg.children) out.children = localizeSegments(seg.children, t.children)
    return out
  })
}

/** 生成中英双通道搜索串，保证英文界面下中英文关键词都能搜到 */
function buildSearchText(zhSkill, enT) {
  const parts = [
    zhSkill.name, zhSkill.short, zhSkill.category, zhSkill.id,
    CATEGORY_EN[zhSkill.category] || '',
    enT ? enT.name : '', enT ? enT.short : '',
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

/** 单条技能本地化 */
function localizeSkill(skill, lang) {
  const target = lang || currentLang()
  if (!skill) return skill
  const idx = indexOfSkill(skill)
  const enT = idx >= 0 ? SKILLS_EN[idx] : null
  const out = Object.assign({}, skill, {
    searchText: buildSearchText(skill, enT),
    categoryEn: CATEGORY_EN[skill.category] || skill.category,
  })
  if (target !== 'en' || !enT) return out
  out.name = enT.name || skill.name
  out.category = CATEGORY_EN[skill.category] || skill.category
  out.short = enT.short || skill.short
  out.description = enT.description || skill.description
  out.keyPoints = enT.keyPoints || skill.keyPoints
  out.warnings = enT.warnings || skill.warnings
  out.segments = localizeSegments(skill.segments, enT.segments)
  return out
}

/** 列表本地化 */
function localizeSkills(list, lang) {
  const target = lang || currentLang()
  return (list || []).map(s => localizeSkill(s, target))
}

/** 全部技能（按语言） */
function getSkills(lang) {
  return localizeSkills(SKILLS, lang)
}

/** 模块卡片（按语言） */
function getModules(lang) {
  const target = lang || currentLang()
  return MODULES.map(mod => {
    const enT = MODULE_EN[mod.key] || {}
    return Object.assign({}, mod, {
      name: target === 'en' ? (enT.name || mod.name) : mod.name,
      tagline: target === 'en' ? (enT.tagline || mod.tagline) : mod.tagline,
    })
  })
}

/** 分类名（按语言） */
function categoryLabel(name, lang) {
  const target = lang || currentLang()
  return target === 'en' ? (CATEGORY_EN[name] || name) : name
}

/** 教学视频信息（按语言）：标题随技能英文名生成 */
function getVideoInfo(skillId, lang) {
  const target = lang || currentLang()
  const v = VIDEO_MAP[skillId] || {}
  if (target !== 'en') return Object.assign({}, v)
  const idx = SKILLS.findIndex(s => s.id === skillId)
  const enName = idx >= 0 && SKILLS_EN[idx] ? SKILLS_EN[idx].name : ''
  const title = enName ? enName + ' · demo video' : 'Real-person demo'
  return Object.assign({}, v, { title })
}

/** 模块内技能（按语言） */
function getModuleSkillsLocalized(moduleKey, lang) {
  const mod = MODULES.find(m => m.key === moduleKey)
  if (!mod) return []
  return localizeSkills(SKILLS.filter(s => mod.categories.indexOf(s.category) >= 0), lang)
}

/** 通过 id 查找技能（按语言，含用户录制技能） */
function getSkillByIdLocalized(id, lang) {
  const target = lang || currentLang()
  const found = SKILLS.find(s => s.id === id)
  if (found) return localizeSkill(found, target)
  return id && id.indexOf('usr_') === 0 ? getUserSkillById(id) : null
}

module.exports = { SKILLS, CATEGORIES, MODULES, VIDEO_MAP, getModuleSkills, getSkillById, getUserSkills, getUserSkillById, flattenSkill }

module.exports = Object.assign(module.exports, {
  SKILLS_EN,
  CATEGORY_EN,
  MODULE_EN,
  currentLang,
  localizeSkill,
  localizeSkills,
  getSkills,
  getModules,
  categoryLabel,
  getVideoInfo,
  getModuleSkillsLocalized,
  getSkillByIdLocalized,
})
