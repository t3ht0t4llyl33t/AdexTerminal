import type { Language } from './types';

export type TranslationKey =
  | 'app.title'
  | 'app.subtitle'
  | 'nav.radar'
  | 'nav.whales'
  | 'nav.scanner'
  | 'nav.profile'
  | 'nav.partners'
  | 'network.all'
  | 'network.ton'
  | 'network.bsc'
  | 'network.base'
  | 'radar.title'
  | 'radar.subtitle'
  | 'radar.token'
  | 'radar.network'
  | 'radar.volume24h'
  | 'radar.spike15m'
  | 'radar.delta15m'
  | 'radar.whaleRisk'
  | 'radar.security'
  | 'radar.action'
  | 'radar.insiderDistribution'
  | 'radar.insiderTooltip'
  | 'radar.lpLocked'
  | 'radar.lpUnlocked'
  | 'radar.clean'
  | 'radar.devCluster'
  | 'radar.mirrorLink'
  | 'radar.filters'
  | 'radar.spikeThreshold'
  | 'radar.minLiquidity'
  | 'radar.filtersLocked'
  | 'radar.noData'
  | 'radar.live'
  | 'radar.demo'
  | 'whales.title'
  | 'whales.subtitle'
  | 'whales.token'
  | 'whales.type'
  | 'whales.amount'
  | 'whales.time'
  | 'whales.wallet'
  | 'whales.tx'
  | 'whales.buy'
  | 'whales.sell'
  | 'whales.noData'
  | 'whales.smartMoney'
  | 'whales.tonInflows'
  | 'whales.bscInflows'
  | 'whales.baseInflows'
  | 'whales.mirrorTrade'
  | 'whales.insiderWarning'
  | 'whales.crossChain'
  | 'whales.viewTx'
  | 'whales.justNow'
  | 'whales.ago'
  | 'whales.minVolume'
  | 'whales.buysOnly'
  | 'whales.snapshotBtn'
  | 'whales.snapshotTitle'
  | 'whales.snapshotWallet'
  | 'whales.snapshotTrade'
  | 'whales.snapshotHeld'
  | 'whales.snapshotValue'
  | 'whales.snapshotVerdict'
  | 'whales.snapshotError'
  | 'scanner.title'
  | 'scanner.subtitle'
  | 'scanner.token'
  | 'scanner.lpStatus'
  | 'scanner.lpLockPercent'
  | 'scanner.lpLockedUntil'
  | 'scanner.devCluster'
  | 'scanner.honeypot'
  | 'scanner.buyTax'
  | 'scanner.sellTax'
  | 'scanner.verified'
  | 'scanner.unverified'
  | 'scanner.riskScore'
  | 'scanner.holders'
  | 'scanner.topHolder'
  | 'scanner.noData'
  | 'scanner.searchPlaceholder'
  | 'scanner.scanButton'
  | 'scanner.scanning'
  | 'scanner.lpBurned'
  | 'scanner.lpUnlockedRisk'
  | 'scanner.honeypotPassed'
  | 'scanner.honeypotDetected'
  | 'scanner.creatorBalance'
  | 'scanner.insiderWeight'
  | 'scanner.apexAiVerdict'
  | 'scanner.apexAiLabel'
  | 'scanner.devClusterTitle'
  | 'scanner.deployerWallet'
  | 'scanner.insiderWalletA'
  | 'scanner.insiderWalletB'
  | 'scanner.insiderWalletC'
  | 'scanner.devClusterAlert'
  | 'scanner.dailyLimitExhausted'
  | 'scanner.dailyLimitLabel'
  | 'scanner.getBonusScans'
  | 'scanner.bonusGranted'
  | 'scanner.bonusAlreadyClaimed'
  | 'scanner.enterAddress'
  | 'scanner.auditSummary'
  | 'scanner.card1Title'
  | 'scanner.card2Title'
  | 'scanner.card3Title'
  | 'scanner.card4Title'
  | 'scanner.highRisk'
  | 'scanner.lowRisk'
  | 'scanner.verdictSafe'
  | 'scanner.verdictCaution'
  | 'scanner.verdictDanger'
  | 'scanner.tonArchitecture'
  | 'scanner.tonMintTitle'
  | 'scanner.tonMintNotMintable'
  | 'scanner.tonMintMintable'
  | 'scanner.tonOwnerTitle'
  | 'scanner.tonOwnerRenounced'
  | 'scanner.tonOwnerActive'
  | 'scanner.tonOwnerUnknown'
  | 'scanner.tonLpTitle'
  | 'scanner.tonLpNoPools'
  | 'scanner.tonLpLow'
  | 'scanner.tonLpHealthy'
  | 'scanner.tonPoolsFound'
  | 'scanner.tonLiquidityLabel'
  | 'scanner.tonAgeLabel'
  | 'scanner.tonAgeDays'
  | 'scanner.tonAgeUnknown'
  | 'scanner.tonVerifiedYes'
  | 'scanner.tonVerifiedNo'
  | 'scanner.tonNativeSubtitle'
  | 'onboarding.slide1Title'
  | 'onboarding.slide1Body'
  | 'onboarding.slide2Title'
  | 'onboarding.slide2Body'
  | 'onboarding.slide3Title'
  | 'onboarding.slide3Body'
  | 'onboarding.skip'
  | 'onboarding.next'
  | 'onboarding.startScan'
  | 'onboarding.progress'
  | 'profile.title'
  | 'profile.subtitle'
  | 'profile.alerts'
  | 'profile.alertType'
  | 'profile.threshold'
  | 'profile.networks'
  | 'profile.enabled'
  | 'profile.addAlert'
  | 'profile.alertNetwork'
  | 'profile.thresholdUnitPct'
  | 'profile.thresholdUnitUsd'
  | 'profile.alertsLocked'
  | 'profile.alertSpike'
  | 'profile.alertWhale'
  | 'profile.alertsCount'
  | 'profile.noAlerts'
  | 'profile.connectedWallet'
  | 'profile.noWallet'
  | 'profile.connectWallet'
  | 'profile.disconnect'
  | 'profile.plan'
  | 'profile.planFree'
  | 'profile.planPro'
  | 'profile.upgrade'
  | 'profile.walletConnected'
  | 'profile.proConfig'
  | 'profile.lockedFeature'
  | 'profile.academyTitle'
  | 'profile.academyRuleA'
  | 'profile.academyRuleAContent'
  | 'profile.academyRuleB'
  | 'profile.academyRuleBContent'
  | 'profile.academyRuleC'
  | 'profile.academyRuleCContent'
  | 'profile.academyProTitle'
  | 'profile.academyProContent'
  | 'profile.academyProCta'
  | 'profile.supportPrompt'
  | 'profile.supportButton'
  | 'profile.b2bTitle'
  | 'profile.b2bButton'
  | 'partners.title'
  | 'partners.subtitle'
  | 'partners.referralCode'
  | 'partners.copyLink'
  | 'partners.copied'
  | 'partners.totalReferrals'
  | 'partners.activeReferrals'
  | 'partners.totalEarnings'
  | 'partners.pendingPayouts'
  | 'partners.tier'
  | 'partners.commission'
  | 'partners.shareTelegram'
  | 'partners.shareTwitter'
  | 'partners.howItWorks'
  | 'partners.step1'
  | 'partners.step2'
  | 'partners.step3'
  | 'partners.complianceTitle'
  | 'partners.complianceBody'
  | 'partners.launchTelegram'
  | 'partners.evmTitle'
  | 'partners.evmConnect'
  | 'partners.evmConnected'
  | 'partners.evmPayBnb'
  | 'partners.evmPayEth'
  | 'partners.evmPayUsdt'
  | 'partners.evmPayUsdc'
  | 'partners.evmProTier'
  | 'partners.evmDisconnect'
  | 'partners.tonSecurityWarning'
  | 'partners.connectTon'
  | 'partners.connectTonLine1'
  | 'partners.connectTonLine2'
  | 'partners.connecting'
  | 'partners.tonConnected'
  | 'partners.disconnectWallet'
  | 'partners.shareFriends'
  | 'partners.shareMessage'
  | 'partners.totalInvited'
  | 'partners.earnedRewards'
  | 'partners.earnedRewardsHint'
  | 'partners.payoutInfo'
  | 'partners.unclaimedTitle'
  | 'partners.unclaimedBody'
  | 'partners.claimButton'
  | 'partners.claiming'
  | 'partners.claimSuccess'
  | 'partners.walletNotConnected'
  | 'paywall.desktop.title'
  | 'paywall.desktop.body'
  | 'paywall.desktop.launch'
  | 'paywall.miniapp.title'
  | 'paywall.miniapp.body'
  | 'paywall.miniapp.pay'
  | 'paywall.close'
  | 'paywall.proFeaturesTitle'
  | 'paywall.feature.radar'
  | 'paywall.feature.whale'
  | 'paywall.feature.scanner'
  | 'paywall.tonConnect'
  | 'paywall.tonConnect.hint'
  | 'paywall.cryptoPay'
  | 'paywall.cryptoPay.hint'
  | 'paywall.stars'
  | 'paywall.stars.hint'
  | 'paywall.referralHint'
  | 'paywall.tonPaymentNote'
  | 'risk.advisory'
  | 'risk.advisoryLabel'
  | 'common.copy'
  | 'common.copied'
  | 'common.loading'
  | 'common.error'
  | 'common.retry'
  | 'common.close'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.add'
  | 'common.search'
  | 'common.all'
  | 'common.yes'
  | 'common.no'
  | 'common.enabled'
  | 'common.disabled'
  | 'common.invalidAddress'
  | 'risk.nfaLine';

type TranslationDict = Record<TranslationKey, string>;

const en: TranslationDict = {
  'app.title': 'aDEX Terminal',
  'app.subtitle': 'Institutional Crypto Quant Terminal',
  'nav.radar': 'Radar',
  'nav.whales': 'Whales',
  'nav.scanner': 'Scanner',
  'nav.profile': 'Profile',
  'nav.partners': 'Partners',
  'network.all': 'ALL',
  'network.ton': 'TON',
  'network.bsc': 'BSC',
  'network.base': 'BASE',
  'radar.title': 'Spikes Radar',
  'radar.subtitle': 'On-chain volume spike detector • TON • BSC • Base',
  'radar.token': 'Token',
  'radar.network': 'Network',
  'radar.volume24h': '24h Volume',
  'radar.spike15m': 'Spike (15m)',
  'radar.delta15m': 'Delta (15m)',
  'radar.whaleRisk': 'Whale Risk',
  'radar.security': 'Security',
  'radar.action': 'Action',
  'radar.insiderDistribution': 'Insider Distribution',
  'radar.insiderTooltip':
    'Top holders were seen offloading into rising retail volume in the last 15 minutes.',
  'radar.lpLocked': 'LP Locked',
  'radar.lpUnlocked': 'Unlocked',
  'radar.clean': 'Clean',
  'radar.devCluster': 'DEV CLUSTER',
  'radar.mirrorLink': 'Mirror Link',
  'radar.filters': 'Advanced Filters',
  'radar.spikeThreshold': 'Volume Surge %',
  'radar.minLiquidity': 'Min Liquidity',
  'radar.filtersLocked': 'Pro Filters Locked',
  'radar.noData': 'No tokens matching current filters',
  'radar.live': 'LIVE',
  'radar.demo': 'DEMO',
  'whales.title': 'Whales Tracker',
  'whales.subtitle': 'Real-time whale wallets',
  'whales.token': 'Token',
  'whales.type': 'Type',
  'whales.amount': 'Amount',
  'whales.time': 'Time',
  'whales.wallet': 'Wallet',
  'whales.tx': 'Tx',
  'whales.buy': 'BUY',
  'whales.sell': 'SELL',
  'whales.noData': 'No whale movements detected',
  'whales.smartMoney': 'Live Whale Alerts',
  'whales.tonInflows': 'TON Inflows (24h)',
  'whales.bscInflows': 'BSC Inflows (24h)',
  'whales.baseInflows': 'BASE Inflows (24h)',
  'whales.mirrorTrade': 'Mirror Trade',
  'whales.insiderWarning': 'Insider Distribution (Whales Exiting)',
  'whales.crossChain': 'Cross-Chain Wallet',
  'whales.viewTx': 'View Tx',
  'whales.justNow': 'Just now',
  'whales.ago': 'ago',
  'whales.minVolume': 'Min Volume',
  'whales.buysOnly': 'Buys Only',
  'whales.snapshotBtn': 'Analyze Position',
  'whales.snapshotTitle': 'Whale X-Ray',
  'whales.snapshotWallet': 'Whale Wallet',
  'whales.snapshotTrade': 'Injected in this trade',
  'whales.snapshotHeld': 'Total tokens held',
  'whales.snapshotValue': 'Total position value',
  'whales.snapshotVerdict': 'Terminal Read',
  'whales.snapshotError': 'Failed to load position data',
  'scanner.title': 'Security Vault',
  'scanner.subtitle': 'Deep contract security analysis & LP-lock verification',
  'scanner.token': 'Token',
  'scanner.lpStatus': 'LP Status',
  'scanner.lpLockPercent': 'LP Locked %',
  'scanner.lpLockedUntil': 'Locked Until',
  'scanner.devCluster': 'Dev Cluster',
  'scanner.honeypot': 'Honeypot',
  'scanner.buyTax': 'Buy Tax',
  'scanner.sellTax': 'Sell Tax',
  'scanner.verified': 'Verified',
  'scanner.unverified': 'Unverified',
  'scanner.riskScore': 'Risk Score',
  'scanner.holders': 'Holders',
  'scanner.topHolder': 'Top Holder %',
  'scanner.noData': 'No security scans available',
  'scanner.searchPlaceholder': 'Enter a contract address..',
  'scanner.scanButton': 'Scan Contract',
  'scanner.scanning': 'Scanning...',
  'scanner.lpBurned': '100% LP BURNED / LOCKED',
  'scanner.lpUnlockedRisk': 'UNLOCKED LIQUIDITY RISK',
  'scanner.honeypotPassed': 'PASSED (Token can be sold freely)',
  'scanner.honeypotDetected': 'HONEYPOT DETECTED (Sell function is hardcoded as blocked)',
  'scanner.creatorBalance': '{percent}% deployer share • mint status pinned to contract state',
  'scanner.insiderWeight': '{percent}% top holder concentration',
  'scanner.apexAiVerdict': 'Cluster fingerprint present. Handle sized, not stacked.',
  'scanner.apexAiLabel': 'Risk Assessment',
  'scanner.devClusterTitle': 'Dev Cluster Linker Visualizer',
  'scanner.deployerWallet': 'Deployer Wallet (Creator)',
  'scanner.insiderWalletA': 'Insider Wallet A',
  'scanner.insiderWalletB': 'Insider Wallet B',
  'scanner.insiderWalletC': 'Insider Wallet C',
  'scanner.devClusterAlert': 'Dev cluster linked • {count} wallets hold {percent}% of supply, traced back to the deployer. Handle with tight sizing — coordinated dumps are on the table.',
  'scanner.dailyLimitExhausted': 'Daily Free Limit Exhausted (10/10)',
  'scanner.dailyLimitLabel': 'Daily Free Scans',
  'scanner.getBonusScans': 'Get +5 Free Scans Instantly',
  'scanner.bonusGranted': '+5 bonus scans granted!',
  'scanner.bonusAlreadyClaimed': 'Referral bonus already claimed for this account.',
  'scanner.enterAddress': 'Enter a contract address to begin audit',
  'scanner.auditSummary': 'Audit Summary',
  'scanner.card1Title': 'Liquidity Lock Status',
  'scanner.card2Title': 'Honeypot Test',
  'scanner.card3Title': 'Contract Verification',
  'scanner.card4Title': 'Top Holder Weight',
  'scanner.highRisk': 'Heavy Concentration',
  'scanner.lowRisk': 'Well Distributed',
  'scanner.verdictSafe': 'Contract reads clean • no cluster fingerprint, LP posture healthy. Green light for the tape.',
  'scanner.verdictCaution': 'Contract reads clean but risk pockets present • proceed sized, not stacked.',
  'scanner.verdictDanger': 'Contract reads hot • cluster signals or LP posture flag extreme risk. Rug-shaped setup — step aside.',
  'scanner.tonArchitecture': 'TON native check • LP handling lives inside the jetton contract, not on external lockers. Manual pool review recommended.',
  'scanner.tonMintTitle': 'Mint Status',
  'scanner.tonMintNotMintable': 'NOT MINTABLE — supply is fixed',
  'scanner.tonMintMintable': 'MINTABLE — admin can inflate supply',
  'scanner.tonOwnerTitle': 'Owner Status',
  'scanner.tonOwnerRenounced': 'RENOUNCED — admin removed',
  'scanner.tonOwnerActive': 'ACTIVE ADMIN — control retained',
  'scanner.tonOwnerUnknown': 'UNKNOWN — admin data missing',
  'scanner.tonLpTitle': 'LP Distribution',
  'scanner.tonLpNoPools': 'NO POOLS FOUND on STON.fi / DeDust',
  'scanner.tonLpLow': 'THIN LIQUIDITY — under $5k reserve',
  'scanner.tonLpHealthy': 'LIVE ON {dexes}',
  'scanner.tonPoolsFound': 'Pools',
  'scanner.tonLiquidityLabel': 'Liquidity',
  'scanner.tonAgeLabel': 'Jetton Age',
  'scanner.tonAgeDays': '{days} days',
  'scanner.tonAgeUnknown': 'unknown',
  'scanner.tonVerifiedYes': 'Verified in TonAPI whitelist',
  'scanner.tonVerifiedNo': 'Not in TonAPI whitelist',
  'scanner.tonNativeSubtitle': 'TON native check via TonAPI + STON.fi + DeDust',
  'onboarding.slide1Title': 'Radar catches spikes before DEXScreener',
  'onboarding.slide1Body': 'Live view of new tokens on TON, BSC and BASE. See volume surges the moment they start — not five minutes late.',
  'onboarding.slide2Title': 'Whales shows real $3K+ trades',
  'onboarding.slide2Body': 'Anti-noise filter removes wash trading and bot activity. What you see is what real money is doing right now.',
  'onboarding.slide3Title': 'Scanner audits a contract in 2 seconds',
  'onboarding.slide3Body': 'Mint status, ownership, LP distribution, insider clusters — one score, plain English verdict, no PhD required.',
  'onboarding.skip': 'Skip',
  'onboarding.next': 'Next',
  'onboarding.startScan': 'Start first scan',
  'onboarding.progress': 'Step {step} of 3',
  'profile.title': 'Profile & Alerts',
  'profile.subtitle': 'Manage your wallet, alerts, and subscription',
  'profile.alerts': 'Alert Configurations',
  'profile.alertType': 'Alert Type',
  'profile.threshold': 'Threshold',
  'profile.networks': 'Networks',
  'profile.enabled': 'Enabled',
  'profile.addAlert': 'Add Alert',
  'profile.alertNetwork': 'Network',
  'profile.thresholdUnitPct': '%',
  'profile.thresholdUnitUsd': '$',
  'profile.alertsLocked': 'Custom Alerts — Pro Feature',
  'profile.alertSpike': 'Super Spike',
  'profile.alertWhale': 'Mega Whale',
  'profile.alertsCount': 'alerts used',
  'profile.noAlerts': 'No alerts configured yet',
  'profile.connectedWallet': 'Connected Wallet',
  'profile.noWallet': 'No wallet connected',
  'profile.connectWallet': 'Connect Wallet',
  'profile.disconnect': 'Disconnect',
  'profile.plan': 'Subscription Plan',
  'profile.planFree': 'Free Tier',
  'profile.planPro': 'Pro Tier',
  'profile.upgrade': 'Upgrade to Pro',
  'profile.walletConnected': 'Multi-Chain Wallet Connected',
  'profile.proConfig': 'Pro Configuration',
  'profile.lockedFeature': 'Pro Feature Locked',
  'profile.academyTitle': 'aDEX Academy',
  'profile.academyRuleA': 'Volume Spikes',
  'profile.academyRuleAContent': 'If a token row highlights neon violet (>=250%), it detects an anomalous influx of on-chain volume over a 15-minute window across TON, BSC, or Base. A green highlight (>=150%) signals a moderate spike. Both indicate elevated whale positioning — the stronger the spike, the higher the conviction.',
  'profile.academyRuleB': 'DEX Delta',
  'profile.academyRuleBContent': 'The horizontal bar displays real-time buying (green, left) vs selling (red, right) pressure from DEX pool activity across TON, BSC, and Base. A green skew above 70% suggests aggressive buying pressure, but always confirm with volume and security data before acting.',
  'profile.academyRuleC': 'Rug Pull Shield',
  'profile.academyRuleCContent': 'Never trigger Mirror Trade if the Scanner flags a Dev Cluster alert on any network — BSC, Base, or TON. It signals that a coordinated group of wallets or the jetton admin holds a concentrated share, presenting extreme dump risks. On TON, the scanner checks the admin address and top holders via TonAPI; on EVM chains it uses GoPlus Security data.',
  'profile.academyProTitle': 'Pro Tier Benefits',
  'profile.academyProContent': 'Pro subscription unlocks the full aDEX Terminal across TON, BSC, and Base. Advanced Radar filters hide low-liquidity pools and set custom volume spike thresholds so you catch only clean signals. Whale X-Ray reveals real position size, USD value and terminal read on every smart-money trade. Unlimited Security Vault gives you unrestricted contract audits — GoPlus on EVM, native jetton checks on TON. Custom Alerts notify you the second spikes or whale flows hit your thresholds. All for $9.90/month.',
  'profile.academyProCta': 'Upgrade to Pro',
  'profile.supportPrompt': 'Didn\'t find an answer in the Academy? Message the aDEX support bot — it replies in a few minutes.',
  'profile.supportButton': 'Live Support Chat',
  'profile.b2bTitle': 'Community Discussion / Join the Conversation',
  'profile.b2bButton': 'Open aDEX Community',
  'partners.title': 'Referral Hub',
  'partners.subtitle': 'Earn by referring traders to aDEX',
  'partners.referralCode': 'Your Referral Code',
  'partners.copyLink': 'Copy Referral Link',
  'partners.copied': 'Copied!',
  'partners.totalReferrals': 'Total Referrals',
  'partners.activeReferrals': 'Active Referrals',
  'partners.totalEarnings': 'Total Earnings',
  'partners.pendingPayouts': 'Pending Payouts',
  'partners.tier': 'Your Tier',
  'partners.commission': 'Referral Reward',
  'partners.shareTelegram': 'Share on Telegram',
  'partners.shareTwitter': 'Share on X',
  'partners.howItWorks': 'How It Works',
  'partners.step1': 'Share your unique referral link with traders',
  'partners.step2': 'They sign up via your link and subscribe to aDEX Pro',
  'partners.step3': 'You earn 20% of every payment they make, including renewals',
  'partners.complianceTitle': 'Referral Hub & On-Chain TON Payout Infrastructure is locked to ensure domain zone security. Please launch the official aDEX bot inside Telegram.',
  'partners.complianceBody': 'Referral Hub & On-Chain TON Payout Infrastructure is locked to ensure domain zone security. Please launch the official aDEX bot inside Telegram.',
  'partners.launchTelegram': '[ Launch aDEX Terminal in Telegram ]',
  'partners.evmTitle': 'EVM Desktop Pro Billing Engine',
  'partners.evmConnect': '[ Connect Wallet ]',
  'partners.evmConnected': 'Wallet Connected',
  'partners.evmPayBnb': 'Pay 9.90 USDT (BSC)',
  'partners.evmPayEth': 'Pay 9.90 USDC (Base)',
  'partners.evmPayUsdt': 'Pay 9.90 USDT (ERC-20)',
  'partners.evmPayUsdc': 'Pay 9.90 USDC (ERC-20)',
  'partners.evmProTier': 'Unlock Pro Tier — $9.90/month',
  'partners.evmDisconnect': 'Disconnect Wallet',
  'partners.tonSecurityWarning': 'Wallet connection is used only to identify your Web3 address and route 20% referral commissions to it. The platform is non-custodial and never requests spending permissions on your assets.',
  'partners.connectTon': 'Connect Wallet via TON Connect 2.0',
  'partners.connectTonLine1': 'Connect Wallet',
  'partners.connectTonLine2': 'via TON Connect 2.0',
  'partners.connecting': 'Connecting...',
  'partners.tonConnected': 'Wallet Connected',
  'partners.disconnectWallet': '❌ Disconnect Wallet',
  'partners.shareFriends': 'Share with Friends',
  'partners.shareMessage': 'aDEX Terminal — institutional crypto quant terminal. Real-time whale tracking, rug-pull scanner, and volume spike radar across TON, BSC, and Base.',
  'partners.totalInvited': 'Total Partners',
  'partners.earnedRewards': 'Your Reward',
  'partners.earnedRewardsHint': '(last 30 days)',
  'partners.payoutInfo': '⚡ 20% Referral Commission: Every time your invited user unlocks aDEX Pro filters for $9.90, $2.00 is credited to your pending balance. Connect your TON wallet and click Claim to withdraw accumulated rewards to your wallet.',
  'partners.unclaimedTitle': '📥 Unclaimed rewards detected! Connect wallet to instantly claim.',
  'partners.unclaimedBody': '📥 Unclaimed rewards detected! Connect wallet to instantly claim.',
  'partners.claimButton': 'Claim Pending Rewards',
  'partners.claiming': 'Claiming...',
  'partners.claimSuccess': 'Rewards claimed successfully!',
  'partners.walletNotConnected': 'Wallet not connected',
  'paywall.desktop.title': 'Advanced Microstructure Filtering is locked',
  'paywall.desktop.body':
    'Due to regional compliance, commercial Web3 billing is hosted strictly inside our Telegram Mini App. Please launch the official bot to unlock Pro features.',
  'paywall.desktop.launch': 'Launch Telegram Bot',
  'paywall.miniapp.title': 'Unlock Pro aDEX Filters',
  'paywall.miniapp.body':
    'Get instant access to granular volume spike thresholds, whale alert configuration, and deep Dev Cluster analytical sweeps.',
  'paywall.miniapp.pay': 'Pay via Crypto Pay',
  'paywall.close': 'Close',
  'paywall.proFeaturesTitle': 'Unlock aDEX Pro!',
  'paywall.feature.radar':
    'Advanced Radar Filters — Instantly hide low-liquidity pools and filter by chains to catch clean 15m volume spikes.',
  'paywall.feature.whale':
    'Whale X-Ray — Live on-chain balance, USD value and terminal read on every smart-money move.',
  'paywall.feature.scanner':
    'Unlimited Security Vault — Deep contract audits via GoPlus on EVM and native jetton checks on TON.',
  'paywall.tonConnect': 'Via TON Connect',
  'paywall.tonConnect.hint': '≤ 9.9 USD • rate locked twice daily',
  'paywall.cryptoPay': 'Via Crypto Pay',
  'paywall.cryptoPay.hint': 'TON, USDT, BTC, ETH.. • ≈ 9.9 USD',
  'paywall.stars': 'Via Telegram Stars',
  'paywall.stars.hint': 'Refundable within 21 days',
  'paywall.referralHint': 'Referral 20% applies to any payment method.',
  'paywall.tonPaymentNote': '≈ 9.9 USD',
  'risk.advisory':
    'aDEX Risk Advisory: trading micro-cap pools inside Base, BSC, and TON carries extreme capital volatility. Always verify LP-Lock state via our Security Vault before routing any transaction swap inputs.',
  'risk.advisoryLabel': 'aDEX Risk Advisory',
  'common.copy': 'Copy',
  'common.copied': 'Copied!',
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Retry',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.add': 'Add',
  'common.search': 'Search',
  'common.all': 'All',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.enabled': 'Enabled',
  'common.disabled': 'Disabled',
  'common.invalidAddress': 'Invalid token address',
  'risk.nfaLine': 'Not financial advice. Do your own research.',
};

const ru: TranslationDict = {
  'app.title': 'aDEX Терминал',
  'app.subtitle': 'Институциональный крипто-квант терминал',
  'nav.radar': 'Радар',
  'nav.whales': 'Киты',
  'nav.scanner': 'Сканер',
  'nav.profile': 'Профиль',
  'nav.partners': 'Партнеры',
  'network.all': 'ВСЕ',
  'network.ton': 'TON',
  'network.bsc': 'BSC',
  'network.base': 'BASE',
  'radar.title': 'Радар Спайков',
  'radar.subtitle':
    'Ончейн-детектор всплесков объёма • TON • BSC • Base',
  'radar.token': 'Токен',
  'radar.network': 'Сеть',
  'radar.volume24h': 'Объём 24ч',
  'radar.spike15m': 'Спайк (15м)',
  'radar.delta15m': 'Дельта (15м)',
  'radar.whaleRisk': 'Риск Китов',
  'radar.security': 'Безопасность',
  'radar.action': 'Действие',
  'radar.insiderDistribution': 'Инсайдерская Раздача',
  'radar.insiderTooltip':
    'Топ-холдеры фиксировали продажи на фоне роста ритейл-объёма за последние 15 минут.',
  'radar.lpLocked': 'LP Заблокирован',
  'radar.lpUnlocked': 'Разблокирован',
  'radar.clean': 'Чисто',
  'radar.devCluster': 'DEV КЛАСТЕР',
  'radar.mirrorLink': 'Зеркало',
  'radar.filters': 'Расширенные Фильтры',
  'radar.spikeThreshold': 'Всплеск Объёма %',
  'radar.minLiquidity': 'Мин Ликвидность',
  'radar.filtersLocked': 'Pro Фильтры Заблокированы',
  'radar.noData': 'Нет токенов по текущим фильтрам',
  'radar.live': 'LIVE',
  'radar.demo': 'ДЕМО',
  'whales.title': 'Трекер Китов',
  'whales.subtitle': 'Кошельки китов в реальном времени',
  'whales.token': 'Токен',
  'whales.type': 'Тип',
  'whales.amount': 'Сумма',
  'whales.time': 'Время',
  'whales.wallet': 'Кошелёк',
  'whales.tx': 'Tx',
  'whales.buy': 'ПОКУПКА',
  'whales.sell': 'ПРОДАЖА',
  'whales.noData': 'Движения китов не обнаружены',
  'whales.smartMoney': 'Активных алертов',
  'whales.tonInflows': 'Приток TON (24ч)',
  'whales.bscInflows': 'Приток BSC (24ч)',
  'whales.baseInflows': 'Приток BASE (24ч)',
  'whales.mirrorTrade': 'Зеркальная Сделка',
  'whales.insiderWarning': 'Инсайдерская Раздача (Киты Выходят)',
  'whales.crossChain': 'Кросс-чейн Кошелёк',
  'whales.viewTx': 'Сделка',
  'whales.justNow': 'Только что',
  'whales.ago': 'назад',
  'whales.minVolume': 'Мин Объём',
  'whales.buysOnly': 'Только Покупки',
  'whales.snapshotBtn': 'Анализ Позиции',
  'whales.snapshotTitle': 'Рентген кита',
  'whales.snapshotWallet': 'Кошелёк кита',
  'whales.snapshotTrade': 'Влито в этой сделке',
  'whales.snapshotHeld': 'Всего токена у кита',
  'whales.snapshotValue': 'Общая ценность позиции',
  'whales.snapshotVerdict': 'Оценка терминала',
  'whales.snapshotError': 'Не удалось загрузить данные по позиции',
  'scanner.title': 'Сканер Безопасности',
  'scanner.subtitle':
    'Глубокий анализ безопасности контрактов и проверка LP-локов',
  'scanner.token': 'Токен',
  'scanner.lpStatus': 'Статус LP',
  'scanner.lpLockPercent': 'LP Заблокировано %',
  'scanner.lpLockedUntil': 'Заблокирован до',
  'scanner.devCluster': 'Dev Кластер',
  'scanner.honeypot': 'Honeypot',
  'scanner.buyTax': 'Налог Покупки',
  'scanner.sellTax': 'Налог Продажи',
  'scanner.verified': 'Проверен',
  'scanner.unverified': 'Не проверен',
  'scanner.riskScore': 'Оценка Риска',
  'scanner.holders': 'Холдеры',
  'scanner.topHolder': 'Топ Холдер %',
  'scanner.noData': 'Сканы безопасности недоступны',
  'scanner.searchPlaceholder': 'Введите адрес контракта..',
  'scanner.scanButton': 'Сканировать',
  'scanner.scanning': 'Сканирование...',
  'scanner.lpBurned': '100% LP СОЖЖЕНО / ЗАБЛОКИРОВАНО',
  'scanner.lpUnlockedRisk': 'РИСК НЕЗАБЛОКИРОВАННОЙ ЛИКВИДНОСТИ',
  'scanner.honeypotPassed': 'ПРОЙДЕН (Токен можно свободно продавать)',
  'scanner.honeypotDetected': 'ОБНАРУЖЕН HONEYPOT (Функция продажи заблокирована в коде)',
  'scanner.creatorBalance': '{percent}% у деплойера • mint-статус закреплён в контракте',
  'scanner.insiderWeight': '{percent}% концентрация у топ-холдера',
  'scanner.apexAiVerdict': 'Виден отпечаток кластера. Работаем аккуратно, малым сайзом.',
  'scanner.apexAiLabel': 'Оценка риска',
  'scanner.devClusterTitle': 'Визуализатор кластера разработчиков',
  'scanner.deployerWallet': 'Кошелёк разработчика (Создатель)',
  'scanner.insiderWalletA': 'Инсайдер Кошелёк A',
  'scanner.insiderWalletB': 'Инсайдер Кошелёк B',
  'scanner.insiderWalletC': 'Инсайдер Кошелёк C',
  'scanner.devClusterAlert': 'Dev-кластер подтверждён • {count} кошельков держат {percent}% supply, все получили средства от деплойера. Работаем малым сайзом — согласованные сбросы возможны.',
  'scanner.dailyLimitExhausted': 'Дневной лимит исчерпан (10/10)',
  'scanner.dailyLimitLabel': 'Бесплатных сканов в день',
  'scanner.getBonusScans': 'Получить +5 бесплатных сканов',
  'scanner.bonusGranted': '+5 бонусных сканов начислено!',
  'scanner.bonusAlreadyClaimed': 'Реферальный бонус уже был получен для этого аккаунта.',
  'scanner.enterAddress': 'Введите адрес контракта для начала аудита',
  'scanner.auditSummary': 'Сводка аудита',
  'scanner.card1Title': 'Статус блокировки ликвидности',
  'scanner.card2Title': 'Тест на Honeypot',
  'scanner.card3Title': 'Верификация контракта',
  'scanner.card4Title': 'Вес топ-холдера',
  'scanner.highRisk': 'Тяжёлая концентрация',
  'scanner.lowRisk': 'Распределение ровное',
  'scanner.verdictSafe': 'Контракт читается чисто • отпечатка кластера нет, LP в норме. Зелёный свет для входа.',
  'scanner.verdictCaution': 'Контракт читается чисто, но есть точки риска • заходим малым сайзом.',
  'scanner.verdictDanger': 'Контракт горячий • сигналы кластера или LP флагуют экстремальный риск. Форма скама — отходим в сторону.',
  'scanner.tonArchitecture': 'TON нативный чек • логика LP живёт в контракте jetton, не на внешних локерах. Рекомендуется ручная проверка пула.',
  'scanner.tonMintTitle': 'Mint-статус',
  'scanner.tonMintNotMintable': 'НЕЛЬЗЯ МИНТИТЬ — эмиссия зафиксирована',
  'scanner.tonMintMintable': 'МОЖНО МИНТИТЬ — админ может раздуть supply',
  'scanner.tonOwnerTitle': 'Статус админа',
  'scanner.tonOwnerRenounced': 'ADMIN СНЯТ — контроль отозван',
  'scanner.tonOwnerActive': 'АКТИВНЫЙ ADMIN — контроль сохранён',
  'scanner.tonOwnerUnknown': 'НЕИЗВЕСТНО — нет данных о админе',
  'scanner.tonLpTitle': 'Распределение LP',
  'scanner.tonLpNoPools': 'ПУЛОВ НЕТ на STON.fi / DeDust',
  'scanner.tonLpLow': 'ТОНКАЯ ЛИКВИДНОСТЬ — резерв меньше $5k',
  'scanner.tonLpHealthy': 'ЛИСТИНГ НА {dexes}',
  'scanner.tonPoolsFound': 'Пулов',
  'scanner.tonLiquidityLabel': 'Ликвидность',
  'scanner.tonAgeLabel': 'Возраст jetton',
  'scanner.tonAgeDays': '{days} дн.',
  'scanner.tonAgeUnknown': 'неизвестно',
  'scanner.tonVerifiedYes': 'В whitelist TonAPI',
  'scanner.tonVerifiedNo': 'Нет в whitelist TonAPI',
  'scanner.tonNativeSubtitle': 'TON нативный аудит через TonAPI + STON.fi + DeDust',
  'onboarding.slide1Title': 'Radar ловит всплески раньше DEXScreener',
  'onboarding.slide1Body': 'Живой поток новых токенов TON, BSC и BASE. Всплеск объёма виден в момент, а не через пять минут.',
  'onboarding.slide2Title': 'Whales показывает реальные сделки $3K+',
  'onboarding.slide2Body': 'Анти-шум фильтр отсекает wash-trading и ботов. Здесь — только то, куда двигаются реальные деньги прямо сейчас.',
  'onboarding.slide3Title': 'Scanner оценивает контракт за 2 секунды',
  'onboarding.slide3Body': 'Mint, владелец, распределение ликвидности, инсайдер-кластеры — один балл и человеческий вердикт без криптоволшебства.',
  'onboarding.skip': 'Пропустить',
  'onboarding.next': 'Далее',
  'onboarding.startScan': 'Начать первый скан',
  'onboarding.progress': 'Шаг {step} из 3',
  'profile.title': 'Профиль и Алерты',
  'profile.subtitle': 'Управление кошельком,\nалертами и подпиской',
  'profile.alerts': 'Конфигурация Алертов',
  'profile.alertType': 'Тип Алерта',
  'profile.threshold': 'Порог',
  'profile.networks': 'Сети',
  'profile.enabled': 'Включён',
  'profile.addAlert': 'Добавить Алерт',
  'profile.alertNetwork': 'Сеть',
  'profile.thresholdUnitPct': '%',
  'profile.thresholdUnitUsd': '$',
  'profile.alertsLocked': 'Кастомные Алерты — Pro Функция',
  'profile.alertSpike': 'Супер-Спайк',
  'profile.alertWhale': 'Мега-Кит',
  'profile.alertsCount': 'алертов использовано',
  'profile.noAlerts': 'Алерты ещё не настроены',
  'profile.connectedWallet': 'Подключённый Кошелёк',
  'profile.noWallet': 'Кошелёк не подключён',
  'profile.connectWallet': 'Подключить Кошелёк',
  'profile.disconnect': 'Отключить',
  'profile.plan': 'Тарифный План',
  'profile.planFree': 'Бесплатный',
  'profile.planPro': 'Pro Тариф',
  'profile.upgrade': 'Перейти на Pro',
  'profile.walletConnected': 'Мультичейн кошелёк подключён',
  'profile.proConfig': 'Pro Конфигурация',
  'profile.lockedFeature': 'Pro Функция Заблокирована',
  'profile.academyTitle': 'aDEX Академия',
  'profile.academyRuleA': 'Всплески Объёма',
  'profile.academyRuleAContent': 'Если строка токена подсвечена неоновым фиолетовым (>=250%), система зафиксировала аномальный всплеск ончейн-объёмов за 15 минут в сетях TON, BSC или Base. Зелёная подсветка (>=150%) сигнализирует умеренный всплеск. Оба маркера указывают на активность крупных игроков — чем сильнее всплеск, тем выше уверенность.',
  'profile.academyRuleB': 'DEX Дельта',
  'profile.academyRuleBContent': 'Полоса показывает соотношение покупок (зелёный, слева) и продаж (красный, справа) по активности DEX-пулов в сетях TON, BSC и Base. Перекос зелёной зоны >70% указывает на агрессивное давление покупок, но всегда сверяйтесь с данными по объёму и безопасности перед действием.',
  'profile.academyRuleC': 'Защита от Rug Pull',
  'profile.academyRuleCContent': 'Никогда не копируйте сделку, если Сканер выдает алерт Dev Cluster для любой сети — BSC, Base или TON. Это означает, что группа кошельков или админ джеттона держат концентрированную долю — риск мгновенного скама. На TON сканер проверяет адрес админа и топ-холдеров через TonAPI; на EVM-сетях использует данные GoPlus Security.',
  'profile.academyProTitle': 'Преимущества Pro Тарифа',
  'profile.academyProContent': 'Pro-подписка открывает полный aDEX Terminal в сетях TON, BSC и Base. Расширенные фильтры радара скрывают пулы с низкой ликвидностью и задают кастомные пороги всплесков объёма, чтобы ловить только чистые сигналы. Whale X-Ray показывает реальный размер позиции, стоимость в USD и оценку терминала для каждой сделки smart money. Безлимитный Security Vault даёт неограниченные аудиты контрактов — GoPlus на EVM, нативные проверки джеттонов на TON. Кастомные алерты мгновенно уведомляют, когда всплески или движения китов достигают ваших порогов. Всё это за $9.90/мес.',
  'profile.academyProCta': 'Перейти на Pro',
  'profile.supportPrompt': 'Не нашли ответ в Академии? Напишите в бот поддержки aDEX — отвечаем в течение нескольких минут.',
  'profile.supportButton': 'Написать в Поддержку',
  'profile.b2bTitle': 'Обсуждение в Сообществе / Присоединиться к Обсуждению',
  'profile.b2bButton': 'Открыть aDEX Community',
  'partners.title': 'Реферальный Хаб',
  'partners.subtitle':
    'Зарабатывайте, приглашая\nтрейдеров на aDEX',
  'partners.referralCode': 'Ваш Реферальный Код',
  'partners.copyLink': 'Копировать Реферальную Ссылку',
  'partners.copied': 'Скопировано!',
  'partners.totalReferrals': 'Всего Рефералов',
  'partners.activeReferrals': 'Активных Рефералов',
  'partners.totalEarnings': 'Всего Заработано',
  'partners.pendingPayouts': 'Ожидают Выплаты',
  'partners.tier': 'Ваш Уровень',
  'partners.commission': 'Реферальное Вознаграждение',
  'partners.shareTelegram': 'Поделиться в Telegram',
  'partners.shareTwitter': 'Поделиться в X',
  'partners.howItWorks': 'Как Это Работает',
  'partners.step1': 'Поделитесь уникальной реферальной ссылкой с трейдерами',
  'partners.step2': 'Они регистрируются по вашей ссылке и оформляют Pro подписку',
  'partners.step3': 'Вы получаете 20% от каждого их платежа, включая продления',
  'partners.complianceTitle': 'Реферальный хаб и инфраструктура ончейн-выплат TON заблокированы в целях безопасности доменной зоны. Пожалуйста, запустите официального бота aDEX внутри Telegram.',
  'partners.complianceBody': 'Реферальный хаб и инфраструктура ончейн-выплат TON заблокированы в целях безопасности доменной зоны. Пожалуйста, запустите официального бота aDEX внутри Telegram.',
  'partners.launchTelegram': '[ Запустить aDEX Terminal в Telegram ]',
  'partners.evmTitle': 'EVM Desktop Pro Биллинговый Движок',
  'partners.evmConnect': '[ Подключить Кошелёк ]',
  'partners.evmConnected': 'Кошелёк Подключён',
  'partners.evmPayBnb': 'Оплатить 9.90 USDT (BSC)',
  'partners.evmPayEth': 'Оплатить 9.90 USDC (Base)',
  'partners.evmPayUsdt': 'Оплатить 9.90 USDT (ERC-20)',
  'partners.evmPayUsdc': 'Оплатить 9.90 USDC (ERC-20)',
  'partners.evmProTier': 'Открыть Pro Тариф — $9.90/мес',
  'partners.evmDisconnect': 'Отключить Кошелёк',
  'partners.tonSecurityWarning': 'Подключение кошелька нужно только для того, чтобы зафиксировать ваш Web3-адрес и зачислять на него 20% реферальных выплат. Платформа некастодиальная и не запрашивает доступ к вашим средствам.',
  'partners.connectTon': 'Подключить Кошелёк через TON Connect 2.0',
  'partners.connectTonLine1': 'Подключить кошелёк',
  'partners.connectTonLine2': 'Через TON Connect 2.0',
  'partners.connecting': 'Подключение...',
  'partners.tonConnected': 'Кошелёк Подключён',
  'partners.disconnectWallet': '❌ Отключить Кошелёк',
  'partners.shareFriends': 'Поделиться с друзьями',
  'partners.shareMessage': 'aDEX Терминал — институциональный крипто-квант терминал. Трекер китов, сканер rug-pull схем и радар всплесков объёма в реальном времени по TON, BSC и Base.',
  'partners.totalInvited': 'Всего партнёров',
  'partners.earnedRewards': 'Вознаграждение',
  'partners.earnedRewardsHint': '(последние 30 дней)',
  'partners.payoutInfo': '⚡ 20% Реферальное Вознаграждение: Каждый раз, когда ваш приглашённый пользователь открывает Pro фильтры за $9.90, $2.00 зачисляется на ваш ожидающий баланс. Подключите TON-кошелёк и нажмите «Забрать», чтобы вывести накопленные средства на ваш кошелёк.',
  'partners.unclaimedTitle': '📥 На вашем балансе накопилось от рефералов! Подключите кошелёк, чтобы забрать.',
  'partners.unclaimedBody': '📥 На вашем балансе накопилось от рефералов! Подключите кошелёк, чтобы забрать.',
  'partners.claimButton': 'Забрать Накопленные Средства',
  'partners.claiming': 'Зачисление...',
  'partners.claimSuccess': 'Средства успешно зачислены!',
  'partners.walletNotConnected': 'Кошелёк не подключён',
  'paywall.desktop.title':
    'Расширенная микроструктурная фильтрация заблокирована',
  'paywall.desktop.body':
    'В соответствии с региональными требованиями, коммерческий Web3-биллинг размещён строго внутри нашего Telegram Mini App. Запустите официальный бот для разблокировки Pro-функций.',
  'paywall.desktop.launch': 'Запустить Telegram Бота',
  'paywall.miniapp.title': 'Откройте Pro aDEX Фильтры',
  'paywall.miniapp.body':
    'Получите доступ к гранулярным порогам всплесков объёма, настройке алертов по китам и глубокому анализу Dev Cluster.',
  'paywall.miniapp.pay': 'Оплатить через Crypto Pay',
  'paywall.close': 'Закрыть',
  'paywall.proFeaturesTitle': 'Разблокируй aDEX Pro!',
  'paywall.feature.radar':
    'Расширенные фильтры радара — мгновенно скрывайте пулы с низкой ликвидностью и фильтруйте по сетям, чтобы ловить чистые всплески объёма за 15 минут.',
  'paywall.feature.whale':
    'Whale X-Ray — ончейн-баланс кита, USD-стоимость позиции и оценка терминала для каждой сделки smart money.',
  'paywall.feature.scanner':
    'Безлимитный Security Vault — глубокие аудиты контрактов через GoPlus на EVM и нативные проверки джеттонов на TON.',
  'paywall.tonConnect': 'Via TON Connect',
  'paywall.tonConnect.hint': '≤ 9.9 USD • курс фиксируется дважды в день',
  'paywall.cryptoPay': 'Via Crypto Pay',
  'paywall.cryptoPay.hint': 'TON, USDT, BTC, ETH.. • ≈ 9.9 USD',
  'paywall.stars': 'Via Telegram Stars',
  'paywall.stars.hint': 'Возврат в течение 21 дня',
  'paywall.referralHint': 'Реферальные 20% начисляются за любой способ оплаты.',
  'paywall.tonPaymentNote': '≈ 9.9 USD',
  'risk.advisory':
    'Совет aDEX: Торговля микро-пулами в сетях Base, BSC и TON несёт экстремальную волатильность капитала. Всегда проверяйте статус блокировки ликвидности через Security Vault перед совершением обмена.',
  'risk.advisoryLabel': 'Совет aDEX',
  'common.copy': 'Копировать',
  'common.copied': 'Скопировано!',
  'common.loading': 'Загрузка...',
  'common.error': 'Что-то пошло не так',
  'common.retry': 'Повторить',
  'common.close': 'Закрыть',
  'common.save': 'Сохранить',
  'common.cancel': 'Отмена',
  'common.delete': 'Удалить',
  'common.add': 'Добавить',
  'common.search': 'Поиск',
  'common.all': 'Все',
  'common.yes': 'Да',
  'common.no': 'Нет',
  'common.enabled': 'Включён',
  'common.disabled': 'Выключен',
  'common.invalidAddress': 'Неверный адрес токена',
  'risk.nfaLine': 'Не финансовый совет. Проводите собственную проверку.',
};

const translations: Record<Language, TranslationDict> = { EN: en, RU: ru };

export function translate(lang: Language, key: TranslationKey): string {
  return translations[lang][key] ?? translations.EN[key] ?? key;
}

export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`,
  );
}

export function createTranslator(lang: Language) {
  return (key: TranslationKey) => translate(lang, key);
}
