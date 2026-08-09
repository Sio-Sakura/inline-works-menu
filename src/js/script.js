/**
 * Based on "Inline to Menu Link Animation" by Codrops (Manoela Ilic)
 * https://github.com/codrops/InlineToMenuLink — MIT License (see /LICENSE)
 * Modified for Design by Shio:
 * - no-build plain JS (GSAP via CDN, Splitting.js/imagesloaded removed)
 * - Japanese per-character splitting with kinsoku handling
 * - Explore button navigates to a per-category URL (data-url on each .menu-item)
 */

// viewport size
const calcWinsize = () => ({ width: window.innerWidth, height: window.innerHeight });
let winsize = calcWinsize();
window.addEventListener('resize', () => (winsize = calcWinsize()));

// 画像の読み込み完了を待つ（imagesloadedの代替）
const preloadImages = (selector = 'img') =>
	Promise.all(
		[...document.querySelectorAll(selector)].map(
			img =>
				new Promise(resolve => {
					if (img.complete) return resolve();
					img.addEventListener('load', resolve, { once: true });
					img.addEventListener('error', resolve, { once: true });
				})
		)
	);

// 日本語を1文字ずつ span.word に分割（Splitting.jsの代替）
// 句読点・伸ばし棒などの行頭禁止文字は前の文字と同じspanに入れる
const NO_HEAD_CHARS = '、。，．）」』！？ーぁぃぅぇぉっゃゅょ';
const splitQuoteToChars = quote => {
	[...quote.childNodes].forEach(node => {
		if (node.nodeType !== Node.TEXT_NODE) return;
		const frag = document.createDocumentFragment();
		let prev = null;
		let prevIsLatin = false; // 直前のspanが数字・英字の連続（例: 140, Google, SEO）かどうか
		for (const ch of node.textContent) {
			if (/\s/.test(ch)) {
				prev = null;
				prevIsLatin = false;
				continue;
			}
			const isLatin = /[0-9A-Za-z]/.test(ch);
			// 数字・英単語は1つのspanにまとめて、途中で改行されないようにする
			if (prev && isLatin && prevIsLatin) {
				prev.textContent += ch;
				continue;
			}
			if (prev && NO_HEAD_CHARS.includes(ch)) {
				prev.textContent += ch;
				prevIsLatin = false;
				continue;
			}
			const span = document.createElement('span');
			span.className = 'word';
			span.textContent = ch;
			frag.appendChild(span);
			prev = span;
			prevIsLatin = isLatin;
		}
		quote.replaceChild(frag, node);
	});
};

class Gallery {
	constructor(el) {
		this.DOM = { el: el };
		this.DOM.images = this.DOM.el.querySelectorAll('.gallery__img');
	}
}

class MenuItem {
	constructor(item) {
		this.DOM = { item: item };
		this.DOM.gallery = document.querySelector(item.getAttribute('href'));
		this.gallery = new Gallery(this.DOM.gallery);
		// Exploreボタンの飛び先（index.htmlのdata-urlで指定）
		this.url = item.dataset.url || null;
	}
}

class Menu {
	constructor() {
		this.DOM = {};
		// all frame links
		this.DOM.frameLinks = [...document.querySelectorAll('.oh')];
		// frame links that are links to show only when the menu appears (after clicking on one of the sentence inline links)
		this.DOM.frameLinksContent = this.DOM.frameLinks.filter(el => el.classList.contains('view-content'));
		// remaining (the ones shown initially)
		this.DOM.frameLinksInitial = this.DOM.frameLinks.filter(el => !this.DOM.frameLinksContent.includes(el));
		// close menu button
		this.DOM.closeCtrl = document.querySelector('.frame__close');
		// content element
		this.DOM.content = document.querySelector('.content');
		// the links
		this.DOM.menuItems = [...this.DOM.content.querySelectorAll('.menu-item')];
		// array of MenuItems
		this.menuItems = [];
		this.DOM.menuItems.forEach(item => this.menuItems.push(new MenuItem(item)));
		// remaining text (span.word)
		this.DOM.textWords = [...this.DOM.content.querySelectorAll('.content__quote > span.whitespace, .content__quote > span.word')];
		// gallery deco element
		this.DOM.galleryDeco = document.querySelector('.galleries > .galleries__deco');
		// and gallery entry button
		this.DOM.galleryButton = document.querySelector('.galleries > .galleries__button');
		// check if we are at the initial page (sentence view) or the menu page (menu/gallery view)
		this.isMenuPage = false;
		this.init();
	}
	init() {
		// hide all the frame links that should be visible only after clicking on one of the sentence inline links
		gsap.set(this.DOM.frameLinksContent, {
			pointerEvents: 'none'
		});
		gsap.set(
			this.DOM.frameLinksContent.map(el => el.children),
			{
				y: '-100%'
			}
		);

		// init/bind events
		this.initEvents();
	}
	initEvents() {
		// click on one of the sentence inline links
		this.DOM.menuItems.forEach(menuItem => {
			menuItem.addEventListener('click', this.openMenu.bind(this));
		});

		// click the close menu control
		this.DOM.closeCtrl.addEventListener('click', this.closeMenu.bind(this));

		// Explore: 現在のカテゴリーのページへ（iframe埋め込み時も親ページごと遷移させる）
		this.DOM.galleryButton.addEventListener('click', () => {
			if (!this.isMenuPage || this.isAnimating) return;
			const url = this.menuItems[this.currentMenuItem].url;
			if (url) window.open(url, '_top');
		});

		window.addEventListener('resize', () => {
			if (!this.isMenuPage) return;
			gsap.set(this.DOM.menuItems, {
				x: (i, target) => this.menuTargetX(i, target),
				y: (i, target) => this.menuTargetY(i, target)
			});
		});
	}
	// メニュー表示時の配置：画面中央下に横並び（言葉の間隔30px・画像に被らない下部エリア）
	menuTargetX(index, target) {
		const naturalLeft = target.getBoundingClientRect().left - (gsap.getProperty(target, 'x') || 0);
		// モバイル：右揃え（Closeと同じ右端20pxに合わせる）
		if (winsize.width <= 540) {
			return (winsize.width - 24 - target.offsetWidth) - naturalLeft;
		}
		// PC：中央下に横並び（間隔30px）
		const GAP = 30;
		const items = this.DOM.menuItems;
		const total = items.reduce((sum, el) => sum + el.offsetWidth, 0) + GAP * (items.length - 1);
		let left = (winsize.width - total) / 2;
		for (let i = 0; i < index; i++) {
			left += items[i].offsetWidth + GAP;
		}
		return left - naturalLeft;
	}
	menuTargetY(index, target) {
		const naturalTop = target.getBoundingClientRect().top - (gsap.getProperty(target, 'y') || 0);
		// モバイル：画面上部（Closeの下）に前後で縦に並べる
		if (winsize.width <= 540) {
			const TOP = 100;
			const WORD_GAP = 8;
			let top = TOP;
			for (let i = 0; i < index; i++) {
				top += this.DOM.menuItems[i].offsetHeight + WORD_GAP;
			}
			return top - naturalTop;
		}
		// PC：日本語の言葉の下端 = 下部の英文の上端から30px上
		const decoTop = this.DOM.galleryDeco.offsetTop;
		const targetTop = decoTop - 30 - target.offsetHeight;
		return targetTop - naturalTop;
	}
	// show/hide gallery deco element
	toggleGalleryDeco() {
		return gsap
			.timeline({
				defaults: {
					duration: !this.isMenuPage ? 1 : 0.3,
					ease: 'power4'
				},
				onStart: () => (!this.isMenuPage ? gsap.set(this.DOM.galleryDeco, { x: '15%', y: '100%' }) : null)
			})
			.to(
				this.DOM.galleryDeco,
				{
					opacity: !this.isMenuPage ? 1 : 0,
					x: !this.isMenuPage ? '0%' : '5%',
					y: !this.isMenuPage ? '0%' : '100%'
				},
				!this.isMenuPage ? 0.5 : 0
			);
	}
	showGalleryEntryButton() {
		return gsap
			.timeline({
				onStart: () =>
					gsap.set(this.DOM.galleryButton, {
						scale: 0.9
					})
			})
			.to(
				this.DOM.galleryButton,
				{
					duration: 0.8,
					ease: 'power4',
					opacity: 1,
					scale: 1
				},
				!this.isMenuPage ? 0.5 : 0
			);
	}
	hideGalleryEntryButton() {
		return gsap.timeline().to(
			this.DOM.galleryButton,
			{
				duration: 0.3,
				ease: 'power4',
				opacity: 0,
				scale: 0.9
			},
			!this.isMenuPage ? 0.5 : 0
		);
	}
	// show links for the content or initial page
	toggleFrameLinks() {
		return gsap
			.timeline({
				defaults: {
					duration: !this.isMenuPage ? 1 : 0.6,
					ease: !this.isMenuPage ? 'power4.inOut' : 'power4'
				},
				onStart: () => {
					// pointer events logic for the frame links:
					gsap.set(!this.isMenuPage ? this.DOM.frameLinksInitial : this.DOM.frameLinksContent, {
						pointerEvents: 'none'
					});
					gsap.set(!this.isMenuPage ? this.DOM.frameLinksContent : this.DOM.frameLinksInitial, {
						pointerEvents: 'auto'
					});
				}
			})
			.to(
				this.DOM.frameLinksInitial.map(el => el.children),
				{
					y: !this.isMenuPage ? '100%' : '0%'
				}
			)
			.to(
				this.DOM.frameLinksContent.map(el => el.children),
				{
					y: !this.isMenuPage ? '0%' : '-100%'
				},
				0
			);
	}
	openMenu(ev) {
		ev.preventDefault();

		// 最初のキーワードの「常時下線」ヒントは、初回操作で役目を終える
		const startHint = document.querySelector('.menu-item--start');
		if (startHint) startHint.classList.remove('menu-item--start');

		// モバイル：ギャラリー表示中だけ内側スクロールを許可（文章画面はロックして親ページへスクロールを渡す）
		document.body.classList.add('is-menu-open');

		const clickedMenuItemIndex = this.DOM.menuItems.indexOf(ev.target);

		// return if currently animating or if the clicked menu item is the current selected one
		if (this.isAnimating || (this.isMenuPage && this.currentMenuItem === clickedMenuItemIndex)) return;
		this.isAnimating = true;

		// remove active class from the current menu item
		if (this.isMenuPage) {
			this.previousMenuItem = this.currentMenuItem;
			this.DOM.menuItems[this.currentMenuItem].classList.remove('menu-item--active');
		}
		// index of clicked menu item
		this.currentMenuItem = clickedMenuItemIndex;

		// add class menu-item--active to the clicked menu item and content--menu to the content element
		// related to the link underline animation (CSS)
		ev.target.classList.add('menu-item--active');

		// if we go from the sentence page to the menu page:
		if (!this.isMenuPage) {
			this.DOM.content.classList.add('content--menu');

			this.togglePage();
		}
		// else if we click another menu item while on the menu page
		else {
			Promise.all([this.hideGalleryEntryButton(), this.closeGallery(this.previousMenuItem)])
				.then(() => Promise.all([this.openGallery(), this.showGalleryEntryButton()]))
				.then(() => (this.isAnimating = false));
		}
	}
	closeMenu() {
		if (this.isAnimating) return;
		this.isAnimating = true;

		document.body.classList.remove('is-menu-open');

		// モバイル：スクロール位置を先頭に戻してから、固定を解除して滑らかに戻す
		if (winsize.width <= 540) {
			window.scrollTo(0, 0);
			// 枠内スクロールも先頭に戻す
			const gal = this.menuItems[this.currentMenuItem].gallery.DOM.el;
			if (gal) gal.scrollTop = 0;
			this.unpinMenuItemsMobile();
		}

		// related to the link underline animation (CSS)
		this.DOM.menuItems[this.currentMenuItem].classList.remove('menu-item--active');
		this.DOM.content.classList.remove('content--menu');

		this.togglePage();
	}
	togglePage() {
		Promise.all([
			this.toggleFrameLinks(),
			this.toggleLinksToMenu(),
			this[!this.isMenuPage ? 'openGallery' : 'closeGallery'](),
			this.toggleGalleryDeco(),
			this[!this.isMenuPage ? 'showGalleryEntryButton' : 'hideGalleryEntryButton']()
		]).then(() => {
			this.isMenuPage = !this.isMenuPage;
			this.isAnimating = false;
			// モバイル：移動アニメーション完了後に、同じ見た目のままスクロール固定へ切り替える
			if (this.isMenuPage && winsize.width <= 540) {
				this.pinMenuItemsMobile();
			}
		});
	}
	// 言葉を現在の描画位置のままposition:fixedに切り替える（スクロールしても上部に残る）
	// 注意：1つずつ固定すると文章が組み直されて後続の位置が狂うため、全員分を先に測ってから一括で切り替える
	pinMenuItemsMobile() {
		const rects = this.DOM.menuItems.map(item => item.getBoundingClientRect());
		this.DOM.menuItems.forEach((item, i) => {
			const r = rects[i];
			gsap.set(item, { x: 0, y: 0 });
			item.style.position = 'absolute';
			item.style.top = r.top + 'px';
			item.style.left = r.left + 'px';
			item.style.whiteSpace = 'nowrap';
			item.style.zIndex = 300;
			item.dataset.pinned = '1';
		});
	}
	// 固定を解除し、見た目の位置を保ったままtransform座標に引き継ぐ（閉じるアニメーションが滑らかに戻れる）
	// こちらも「全部解除→全部測る→全部引き継ぐ」の順で、解除中の組み直しの影響を受けないようにする
	unpinMenuItemsMobile() {
		const items = this.DOM.menuItems.filter(item => item.dataset.pinned);
		if (!items.length) return;
		const pinnedRects = items.map(item => item.getBoundingClientRect());
		items.forEach(item => {
			item.style.position = '';
			item.style.top = '';
			item.style.left = '';
			item.style.whiteSpace = '';
			item.style.zIndex = '';
			delete item.dataset.pinned;
			gsap.set(item, { x: 0, y: 0 });
		});
		const naturalRects = items.map(item => item.getBoundingClientRect());
		items.forEach((item, i) => {
			gsap.set(item, {
				x: pinnedRects[i].left - naturalRects[i].left,
				y: pinnedRects[i].top - naturalRects[i].top
			});
		});
	}
	// animate links to the right side and the remaining text to the left, fading out
	// or vice versa
	toggleLinksToMenu() {
		return gsap
			.timeline({
				defaults: {
					duration: !this.isMenuPage ? 1 : 0.6,
					ease: !this.isMenuPage ? 'power4.inOut' : 'power4'
				}
			})
			.to(
				this.DOM.menuItems,
				{
					x: (i, target) => (!this.isMenuPage ? this.menuTargetX(i, target) : 0),
					y: (i, target) => (!this.isMenuPage ? this.menuTargetY(i, target) : 0),
					stagger: !this.isMenuPage
						? {
								from: this.currentMenuItem,
								amount: 0.15
						  }
						: 0
				},
				0
			)
			.to(
				this.DOM.textWords.sort((a, b) => {
					// words are ordered by its left value
					if (a.offsetLeft < b.offsetLeft) {
						return -1;
					} else if (a.offsetLeft > b.offsetLeft) {
						return 1;
					}
					return 0;
				}),
				{
					x: !this.isMenuPage ? -300 : 0,
					opacity: !this.isMenuPage ? 0 : 1,
					stagger: !this.isMenuPage ? 0.004 : -0.004
				},
				0
			);
	}
	openGallery() {
		// gallery of the cliked menu item
		const gallery = this.menuItems[this.currentMenuItem].gallery;

		return gsap
			.timeline({
				onStart: () => {
					gsap.set(gallery.DOM.images, { opacity: 0 }, 0);
					gallery.DOM.el.classList.add('gallery--current');
				}
			})
			.to(
				gallery.DOM.images,
				{
					duration: 0.1,
					ease: 'expo.inOut',
					opacity: 0.9, /* 写真は透明度90% */
					x: '0%',
					stagger: -0.08
				},
				!this.isMenuPage ? 0.5 : 0
			);
	}
	closeGallery(menuItemIndex = this.currentMenuItem) {
		// hide the current gallery
		const galleryCurrent = this.menuItems[menuItemIndex].gallery;
		return gsap.timeline().to(
			galleryCurrent.DOM.images,
			{
				duration: 0.3,
				ease: 'expo',
				opacity: 0,
				stagger: -0.04,
				onComplete: () => galleryCurrent.DOM.el.classList.remove('gallery--current')
			},
			0
		);
	}
}

// 540px以下のみ：英文を「日本語本文から上下40px」の位置に自動配置
const positionEnglishMobile = () => {
	const tag = document.querySelector('.frame__tagline');
	const title = document.querySelector('.frame__title');
	const credits = document.querySelector('.frame__credits');
	if (winsize.width > 540) {
		[tag, title, credits].forEach(el => {
			el.style.top = '';
			el.style.bottom = '';
		});
		return;
	}
	const q = document.querySelector('.content__quote').getBoundingClientRect();
	tag.style.bottom = 'auto';
	tag.style.top = q.top - 40 - tag.offsetHeight + 'px';
	title.style.bottom = 'auto';
	title.style.top = q.bottom + 40 + "px";
	credits.style.bottom = 'auto';
	credits.style.top = q.bottom + 40 + title.offsetHeight + 8 + "px";
};
window.addEventListener('resize', positionEnglishMobile);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(positionEnglishMobile);

// 切り分け用：URLに noanim=1 が付いていたら下線ヒント演出を止める
if (new URLSearchParams(location.search).has('noanim')) document.documentElement.classList.add('no-hint-anim');

// initialize: 文章を1文字ずつ分割 → 画像読み込みを待つ → 開始
splitQuoteToChars(document.querySelector('.content__quote'));
preloadImages('.gallery__img').then(() => {
	document.body.classList.remove('loading');
	new Menu();
	positionEnglishMobile();
});
