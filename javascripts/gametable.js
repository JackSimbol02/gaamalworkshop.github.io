/*
 * Botzone 2.0 首页游戏桌一览控制脚本
 * 作者：zhouhy
 * 需求：jQuery
 */

var tabListView, dTableView, mutators = {
    SlotToString: function (slots) {
        var html = "";
        for (var i = 0; i < slots.length; i++) {
            var player = slots[i];
            if (player.name && player.name.length > 0)
                html += "【" + __(player.type) + "】" + player.name;
            else
                html += "【" + __("gametable.emptyslot") + "】";
        }
        return html;
    },
    SlotToGrid: function (slots) {
        var html = "";

        // 分散入九宫格
        var grid2slot = [[], [], []];
        switch (slots.length) {
            case 1:
                grid2slot[1][1] = slots[0];
                break;
            case 2:
                grid2slot[0][1] = slots[0];
                grid2slot[2][1] = slots[1];
                break;
            case 3:
                grid2slot[0][1] = slots[0];
                grid2slot[2][0] = slots[1];
                grid2slot[2][2] = slots[2];
                break;
            case 4:
                grid2slot[0][1] = slots[0];
                grid2slot[1][2] = slots[1];
                grid2slot[2][1] = slots[2];
                grid2slot[1][0] = slots[3];
                break;
        }
        for (row = 0; row < 3; row++) {
            html += '<div class="table-row">';
            for (col = 0; col < 3; col++) {
                var player = grid2slot[row][col];
                html += '<div class="table-cell">';
                if (player)
                    if (player.name && player.name.length > 0) {
                        if (player.type == 'bot')
                            html += '<img class="smallavatar" src="/images/Bot.jpeg" />';
                        else
                            html += '<img class="smallavatar" width="30" height="30" src="/avatar/' + player.id + '.png" />';
                        html += '<span>' + player.name + '</span>';
                    } else
                        html += '<img class="smallavatar" width="30" height="30" src="/images/Empty.png" /><span>' + __("gametable.emptyslot") + '</span>';
                html += '</div>';
            }
            html += '</div>';
        }
        return html;
    }
};

function ChangeView(toList) {
    if (toList)
        $("#dTableView").fadeOut(200, function () {
            $("#tabListView").fadeIn(200);
        });
    else
        $("#tabListView").fadeOut(200, function () {
            $("#dTableView").fadeIn(200);
        });
}

function CreateGametable(ctrl) {
    var future = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
    $.cookie("gametable-last-active-game", $("#frmCreateGametable [name=game]").val(), { expires: future, path: '/' });
    $(ctrl).closest(".popover").popover('hide');
    Botzone.replacePage('/gametable/create?' + $('#frmCreateGametable').serialize());
}

function ReloadSingleDigitCaptcha() {
    $("#imgSingleDigitCaptcha").prop("src", "/captcha/digit?" + Math.random());
}

function UpdateTemplate(room, a, b) {
    if (b)
        a = a.find("[data-bindpath]").add(b.find("[data-bindpath]"));
    else
        a = a.find("[data-bindpath]");
    a.each(function () {
        var $this = $(this);
        var mutator = $(this).data('mutator');
        if (mutator && mutator.length > 0)
            $(this).html(mutators[mutator](room[$(this).data("bindpath")]));
        else
            $(this).html(room[$(this).data("bindpath")]);
    });
}

function AddGametable(id, room) {
    $("#list" + id + ", #table" + id).remove();
    var listTemplate = tabListView.find("tr:eq(1)").clone(true).prop("id", "list" + id).show(),
        tableTemplate = dTableView.find("a:eq(0)").clone(true).prop("id", "table" + id).show();
    listTemplate.find("a").prop("href", "/gametable/join/" + id);
    tableTemplate.prop("href", "/gametable/join/" + id);
    UpdateTemplate(room, listTemplate, tableTemplate);
    tabListView.append(listTemplate);
    dTableView.append(tableTemplate);
}

$(document).ready(function () {
    tabListView = $("#tabListView");
    dTableView = $("#dTableView");
    Botzone.gio = Botzone.io_bak.connect(window.location.host + '/index');
    Botzone.gio.connect(); // 再次连接，保证连上

    //$("[data-toggle=tooltip]").tooltip({ container: 'body' })

    var lastGame = $.cookie("gametable-last-active-game");
    if (lastGame)
        $("#frmCreateGametable [name=game] option[value=" + lastGame + "]").prop("selected", true);

    $("#btnCreateGametable").popover({
        title: __("gametable.create.title"),
        content: $("#frmCreateGametable").remove().show(),
        container: "body",
        html: true
    }).click(ReloadSingleDigitCaptcha);

    // 改造成自动完成组合框
    var $cmb = $("#cmbUserName").selectize({
        options: _allUsers,
        labelField: 'name',
        valueField: '_id',
        searchField: ['name']
    });
    Botzone.onExit(function () {
        $cmb[0].selectize.destroy();
    });

    // 接受游戏桌变动事件
    Botzone.gio.removeAllListeners('index.gametables');
    Botzone.gio.removeAllListeners('index.gametable.create');
    Botzone.gio.removeAllListeners('index.gametable.change');
    Botzone.gio.removeAllListeners('index.gametable.destroy');
    Botzone.gio.removeAllListeners('index.gametable.start');
    Botzone.gio.removeAllListeners('index.gametable.end');
    Botzone.gio.removeAllListeners('index.gametables.count');
    Botzone.gio.on('index.gametables', function (data) {
        for (var i in data)
            AddGametable(i, data[i]);
    });
    Botzone.gio.on('index.gametable.create', function (data) {
        AddGametable(data.id, data.room);
    });
    Botzone.gio.on('index.gametable.change', function (data) {
        UpdateTemplate(data.room, $("#list" + data.id), $("#table" + data.id));
    });
    Botzone.gio.on('index.gametable.destroy', function (data) {
        var elements = $("#list" + data + ", #table" + data).removeProp("id");
        var tl = new TimelineMax();
        tl.to(elements, 0.3, { rotation: "180deg", scale: 0 });
        tl.call(function () {
            elements.remove();
        });
    });
    Botzone.gio.on('index.gametable.start', function (data) {
        var listTemplate = $("#list" + data.roomid).prop("id", "mlist" + data.matchid),
            tableTemplate = $("#table" + data.roomid).prop("id", "mtable" + data.matchid).addClass("started");
        listTemplate.find("a").prop("href", "/match/" + data.matchid);
        listTemplate.find("span.join").text(__("gametable.list.watch"));
        tableTemplate.prop("href", "/match/" + data.matchid);
    });
    Botzone.gio.on('index.gametable.end', function (data) {
        var elements = $("#mlist" + data + ", #mtable" + data).removeProp("id");
        var tl = new TimelineMax();
        if (Math.random() < 0.1) {
            tl.to(elements, 0.3, { rotation: "500deg", scale: 5, ease: Back.easeIn });
            tl.to(elements, 0.4, { opacity: 0 });
        } else {
            tl.to(elements, 0.3, { rotation: "180deg", scale: 0 });
        }
        tl.call(function () {
            elements.remove();
        });
    });
    Botzone.gio.on('index.gametables.count', function (data) {
        $("#aGlobalRunningMatches").text(__("activematch", data));
    });

    // 发送ready事件
    Botzone.gio.emit('index.ready');

    [[15, ".game-recommendation .fifteen-days"], [30, ".game-recommendation .thirty-days"], [90, ".game-recommendation .ninety-days"]].forEach(function (v) {
        $.get(gamereco_prefix + v[0], function (data) {
            var $this = $(v[1]);
            if (data.length == 0) {
                $this.text(__("gamereco.visitgames"));
                $this.prop("href", "/games");
            }
            else {
                $this.html(__("gamereco.day-" + v[0]) + "<br />" + data[0]["game"]);
                $this.prop("href", "/game/" + data[0]["game"]);
                $(".game-recommendation").show();
            }
        });
    });
});