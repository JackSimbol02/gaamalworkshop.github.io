/*
 * Botzone 2.0 用户勋章特效与逻辑控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架、greensocks
 */

function SetBadge(slotid, badgeid) {
	Botzone.$post("/config/setbadge", { slotid: slotid, badgeid: badgeid }, function (result) {
		Botzone.replacePage(location.href);
	});
}

$(document).ready(function () {
	$(".user-badge").on("mousemove", function (e) {
		var $this = $(this);
		var width = $this.width(), height = $this.height();
		var x = e.pageX - $this.offset().left;
		var y = e.pageY - $this.offset().top;
		TweenMax.set($this.find(".mouselight").show(), { x: width - x, rotation: (x / width - 0.5) * 15 });
		TweenMax.set($this, {
			transformPerspective: 500,
			rotationY: (x / width - 0.5) * 15,
			rotationX: -(y / height - 0.5) * 5,
			scale: 1.05
		});
	}).on("mouseleave", function (e) {
		var $this = $(this);
		TweenMax.set($this, {
			transformPerspective: 500,
			rotationY: 0,
			rotationX: 0,
			scale: 1
		});
		$this.find(".mouselight").hide();
	});
});