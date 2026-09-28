"""Exercise actual shipped Lua rounds, results, re-entry and physical navigation."""
import json, sys, subprocess
from pathlib import Path
from run import Host, ROOT, build
from lupa.lua55 import LuaRuntime

def check():
    source=(build()/'index.lua').read_text(encoding='utf-8')
    vm=LuaRuntime(unpack_returned_tuples=True)
    rules=vm.execute((ROOT/'app/domain/rules.lua').read_text(encoding='utf-8'))
    config=vm.execute((ROOT/'app/domain/progression.lua').read_text(encoding='utf-8'))
    words=vm.execute((ROOT/'app/domain/words.lua').read_text(encoding='utf-8'))
    game=vm.execute((ROOT/'app/domain/game.lua').read_text(encoding='utf-8')
                    .replace('require("domain.rules")','...')
                    .replace('require("domain.progression")','select(2,...)').replace('require("domain.words")','select(3,...)'),rules,config,words)
    # Device progression has its own staged curriculum, independent of combat bands.
    oracle=[(1,2,2,1,1),(3,2,3,1,2),(6,3,3,2,3),(11,3,3,2,3),(19,3,3,2,3),(27,3,3,2,3)]
    for n,rows,cols,lo,hi in oracle:
        b=game.band(n);assert (b.rows,b.cols,b.fatalMin,b.fatalMax)==(rows,cols,lo,hi)
    for seed in [2,20260923]:
        for _,band in config.bands.items():
            times=[game.time_limit(n,seed)-(2000 if game.rare(seed,n) or n in [11,14] else 0)-(1000 if n in [18,26] else 0) for n in range(band.min,band['end']+1)]
            assert all(a>=b for a,b in zip(times,times[1:]))
    # Force exhausted random search: fallback must remain solvable and match the stage.
    fallback=vm.execute((ROOT/'app/domain/game.lua').read_text(encoding='utf-8')
        .replace('require("domain.rules")','...').replace('require("domain.progression")','select(2,...)').replace('require("domain.words")','select(3,...)')
        .replace('for attempt=1,120 do','for attempt=1,0 do'),rules,config,words)
    for seed in [2,20260923]:
        for level in range(1,41):
            b=fallback.generate(seed,level)
            assert b.tier in ['fallback','words'] and rules.board_valid(b.cells,b.rule)
            assert len({(c.word or c.value) for _,c in b.cells.items()})==len(b.cells)
            assert game.band(level).fatalMin<=b.fatal<=game.band(level).fatalMax
            if level>=11 and level not in [11,14]: assert rules.compound(b.rule)
            if level>=11 and game.operator(level)=="not" and not game.rare(seed,level): assert b.rule.notNumber or b.rule.wordNot
    color_counts={};color_words=set()
    worst=0;tiers=set();examples=0
    h=Host(source)
    for seed in list(range(1,61))+[20260923,2147483646]:
        rare_levels=[];operator_counts={"single":0,"and":0,"or":0,"not":0}
        for level in range(1,41):
            board=game.generate(seed,level);tiers.add(board.tier)
            r=board.rule
            op='not' if r.notNumber or r.wordNot else 'or' if r.mode in ['or','numbers','colorOr'] or r.wordJoin=='or' else 'and' if rules.compound(r) else 'single'
            operator_counts[op]+=1
            if level==18: assert op=='or'
            if level==26: assert op=='not'
            cs=[c for _,c in board.cells.items()]
            rare=board.rule.kind in ['prime','composite'] or (board.rule.second and board.rule.second.kind in ['prime','composite'])
            if rare:
                assert level>30 and game.rare(seed,level)
                assert board.rule.mode=='and' and not board.rule.notNumber
                rare_levels.append(level)
            if level>=11 and level not in [11,14]: assert rules.compound(board.rule)
            if level>=11 and game.operator(level)=="not" and not rare: assert board.rule.notNumber or board.rule.wordNot
            if level>=11 and game.operator(level)=="or" and not rare: assert board.rule.mode in ['or','numbers','colorOr'] or board.rule.wordJoin=='or'
            assert {c.fill for c in cs}=={'black','white'}
            assert all(rules.number_color(c)!=c.fill for c in cs)
            assert rules.board_valid(board.cells,board.rule)
            if board.rule.color:
                assert not game.rare(seed,level)
                assert level>=6 or board.rule.mode=='color'
                assert level>=18 or board.rule.mode!='colorOr'
                color_counts[board.rule.mode]=color_counts.get(board.rule.mode,0)+1
                color_words.add(rules.color_label(board.rule.color))
                if board.rule.other: assert board.rule.other.kind not in ['prime','composite']
            assert len({(c.word or c.value) for c in cs})==len(cs)
            fatal=sum(rules.matches(c,board.rule) for c in cs)
            b=game.band(level)
            assert 1<=fatal<len(cs)
            assert b.fatalMin<=fatal<=b.fatalMax
            assert board.rule.kind!='exact'
            assert not board.rule.second or board.rule.second.kind!='exact'
            assert not board.rule.other or board.rule.other.kind!='exact'
            assert all(not line.isdigit() for _,line in rules.clue_lines(board.rule).items())
            h.s.run=h.table({'generation':config.generation,'seed':seed,'level':level,'score':0,'startScore':0,'pressed':{},'status':'playing'})
            run=game.new(seed);run.level=level;run.remainingMs=game.time_limit(level,seed)
            danger=next(i for i,c in board.cells.items() if rules.matches(c,board.rule))
            assert game.press(run,danger) and run.status=='failed' and run.failureReason=='wrong'
            assert run.hp is None and run.startHp is None and run.score==0 and game.valid(run)
            assert not game.press(run,danger) and run.score==0
            h.frame();worst=max(worst,h.maximum);examples+=1
            assert len(rare_levels)<=3 and all(b-a>1 for a,b in zip(rare_levels,rare_levels[1:]))
        assert operator_counts['single']==12 and operator_counts['not']==6
        assert 7<=operator_counts['or']<=8 and 14<=operator_counts['and']<=15
    assert set(color_counts)=={'color','colorAnd','colorOr'}
    assert color_words=={'黑色数字','白色数字','黑色图形','白色图形'}
    h=Host(source);h.snapshot('campaign-start.png')
    def board_of(host): return game.generate(host.s.run.seed,host.s.run.level)
    def press_safe(host):
        board=board_of(host)
        for i,c in board.cells.items():
            if not rules.matches(c,board.rule): host.tap('cell'+str(i))
        assert host.s.run.status==('complete' if host.s.run.level==40 else 'won') and host.s.page=='result'
    # Clear and advance; result has exactly one actionable target.
    for level in range(1,21):
        before=h.s.run.score
        press_safe(h)
        if level==6: h.snapshot('campaign-success.png')
        layout=h.vm.globals().on_draw(h.ctx,h.vm.globals().g)
        assert len(layout.targets)==1 and layout.targets[1].id=='primary'
        h.key('down');assert h.s.focus==1
        h.tap('primary');assert h.s.run.level==level+1 and h.s.page=='board'
    # Repeat press is a true no-op.
    board=board_of(h);safe=next(i for i,c in board.cells.items() if not rules.matches(c,board.rule))
    h.tap('cell'+str(safe));before=h.ctx.invalidations;score=h.s.run.score
    h.tap('cell'+str(safe));assert h.ctx.invalidations==before and h.s.run.score==score
    def plain(v):
        if hasattr(v,'items'): return {k:plain(x) for k,x in v.items()}
        return v
    restored=Host(source,plain(h.ctx.state))
    assert restored.s.run.level==21 and restored.s.run.score==score and restored.s.run.pressed[safe]
    # Practice adjustments cannot change campaign progress.
    saved=plain(h.s.run);h.key('back');h.key('right');h.tap('practice');h.tap('cell1');h.key('back');h.tap('return')
    assert plain(h.s.run)==saved
    # Clear the remaining campaign via real input, verify final re-entry.
    while h.s.run.level<=40:
        press_safe(h)
        if h.s.run.level==40: break
        h.tap('primary')
    assert h.s.run.status=='complete' and h.s.run.level==40
    h.snapshot('campaign-victory.png')
    restored=Host(source,plain(h.ctx.state));assert restored.s.run.status=='complete'
    assert game.next(game.new())==False
    final_run=vm.table_from(plain(h.s.run),recursive=True)
    assert not game.next(final_run) and final_run.level==40
    old_seed=h.s.run.seed;h.tap('primary')
    assert h.s.run.level==1 and h.s.run.seed!=old_seed and h.s.run.score==0
    # One dangerous press ends the round immediately.
    h=Host(source)
    while h.s.run.status!='failed':
        board=board_of(h)
        for i,c in board.cells.items():
            if rules.matches(c,board.rule):
                h.tap('cell'+str(i))
                if h.s.run.status=='failed': break
        if h.s.run.status!='failed':
            press_safe(h);h.tap('primary')
    assert h.s.run.level==1 and h.s.run.failureReason=='wrong' and h.s.run.hp is None and h.s.page=='result'
    h.snapshot('campaign-failure.png')
    restored=Host(source,plain(h.ctx.state));assert restored.s.page=='result'
    start_score=h.s.run.startScore;level=h.s.run.level
    assert len(h.vm.globals().on_draw(h.ctx,h.vm.globals().g).targets)==1
    h.tap('primary');assert h.s.run.level==1 and h.s.run.failureReason is None and h.s.run.score==0
    # Physical OK must enter a result action without touching the board behind it.
    press_safe(h);h.key('ok');assert h.s.page=='board' and h.s.run.level==level+1
    # A corrupt score/pressed state falls back to a fresh run.
    bad=plain(h.ctx.state);bad['thatbutton']['run']['score']=-1
    assert Host(source,bad).s.run.level==1
    report={'status':'PASS','generated_rounds':examples,'device_band_boundaries':len(oracle),
            'tiers':sorted(tiers),'color_rounds':color_counts,'color_labels':sorted(color_words),'max_draw_commands':max(worst,h.maximum)}
    (ROOT/'artifacts/campaign-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__=='__main__':check()
