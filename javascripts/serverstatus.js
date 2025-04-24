/*
 * Botzone 2.0 服务器状态页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架、Socket.IO
 */
var $table;

$(document).ready(function () {
	$("#tglbtnUserScoreMaintain").click(function () {
		var $this = $(this);
		$this.addClass("disabled");
		$.post('/admin/toggleuserscore', function (result) {
			$this.removeClass("disabled");
			if (result.success == true) {
				if (result.enabled == true)
					$this.addClass("active");
				else
					$this.removeClass("active");
			} else
				alert(result.message);
		}, "json");
	});
	$("#tglbtnRankMaintain").click(function () {
		var $this = $(this);
		$this.addClass("disabled");
		$.post('/admin/togglerank', function (result) {
			$this.removeClass("disabled");
			if (result.success == true) {
				if (result.enabled == true)
					$this.addClass("active");
				else
					$this.removeClass("active");
			} else
				alert(result.message);
		}, "json");
	});
	$("#tglbtnGametable").click(function () {
		var $this = $(this);
		$this.addClass("disabled");
		$.post('/admin/togglegametable', function (result) {
			$this.removeClass("disabled");
			if (result.success == true) {
				if (result.enabled == true)
					$this.addClass("active");
				else
					$this.removeClass("active");
			} else
				alert(result.message);
		}, "json");
	});

	$table = $("#tabStatus");

	Botzone.gio = Botzone.io_bak.connect(window.location.host + '/admin');
	Botzone.gio.connect(); // 再次连接，保证连上

	Botzone.gio.removeAllListeners('admin.statuschange');
	Botzone.gio.on('admin.statuschange', function (status) {
		var html = "<tbody>";
		for (var key in status) {
			var val = status[key];
			if (val instanceof Object) {
				html += '<tr><th colspan="2">' + __('serverstatus.' + key) + '</th></tr>';
				for (var k in val) {
					var v = val[k];
					if (v instanceof Object)
						html += '<tr><td>' + __('serverstatus.' + key + '.' + k) +
						'</td><td><pre class="prettyprint">' +
						JSON.stringify(v, null, '\t') + '</pre></td></tr>';
					else
						html += '<tr><td>' + __('serverstatus.' + key + '.' + k) +
						'</td><td>' + v + '</td></tr>';
				}
			} else
				html += '<tr><td>' + __('serverstatus.' + key) +
				'</td><td>' + val + '</td></tr>';
		}
		html += "</tbody>";
		$table.html(html);
		prettyPrint();
	});
	Botzone.gio.emit('admin.ready');
});