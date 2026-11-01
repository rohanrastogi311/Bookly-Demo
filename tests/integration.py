"""Read/write integration checks against an isolated local Bookly preview.
Run: python tests/integration.py http://terminal.local:4173
Creates synthetic demo sessions; never calls payment or fulfilment providers.
"""
import sys,json,urllib.request,urllib.error,http.cookiejar,concurrent.futures
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://terminal.local:4173'
checks=[]
def client():
 jar=http.cookiejar.CookieJar();return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def call(c,path,body=None,origin=None):
 data=json.dumps(body).encode() if body is not None else None
 headers={'Content-Type':'application/json'}
 if origin:headers['Origin']=origin
 req=urllib.request.Request(BASE+path,data=data,headers=headers)
 try:
  with c.open(req,timeout=45) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
def ok(name,fn):
 fn();checks.append(name);print('PASS',name)
def setup(scenario='birthday'):
 c=client();code,d=call(c,'/api/session');assert code==200,d
 assert not d['capabilities']['ai'],'This test runner expects rehearsal mode; it will not spend live API credits.'
 code,d=call(c,'/api/scenario',{'scenario':scenario});assert code==200,d
 return c
def chat(c,m):
 code,d=call(c,'/api/chat',{'message':m});assert code==200,d;return d['state']
def prepare(c,kind='replacement'):
 s=chat(c,'Where is order BK-1042?');assert s['selectedOrder']=='BK-1042'
 if kind=='replacement':
  s=chat(c,'Yes, she loves dragons.');assert len([q for q in s['quotes'] if q['eligible']])==3
  s=chat(c,'I would like Ember & the Sky Kingdom as the replacement.')
 else:s=chat(c,'I want a refund.')
 assert s['pending'] and not s['receipt'];return s['pending']['token']
def birthday():
 c=setup();s=chat(c,'My daughter’s birthday is tomorrow and her book has not arrived.');assert s['selectedOrder'] is None;assert 'Which one' in s['messages'][-1]['content']
 token=prepare(c);code,d=call(c,'/api/session');assert d['inventory']['ember']==8
 code,d=call(c,'/api/confirm',{'token':token});assert code==200,d;rid=d['receipt']['id'];assert d['receipt']['kind']=='replacement';assert not d['state']['pending']
 code,d=call(c,'/api/session');assert d['state']['receipt']['id']==rid;assert d['inventory']['ember']==7
 code,d=call(c,'/api/confirm',{'token':token});assert code==200 and d['receipt']['id']==rid
 code,d=call(c,'/api/session');assert d['inventory']['ember']==7
 s=chat(c,'Please refund it again.');assert s['receipt']['id']==rid and not s['pending']
ok('clarification, recommendation, confirmation, persistence and idempotent retry',birthday)
def stale():
 c=setup();token=prepare(c);s=chat(c,'I have changed my mind.');assert not s['pending'];code,d=call(c,'/api/confirm',{'token':token});assert code==409;assert call(c,'/api/session')[1]['inventory']['ember']==8
ok('changed conversation invalidates a stale confirmation',stale)
def refund():
 c=setup();t=prepare(c,'refund');code,d=call(c,'/api/confirm',{'token':t});assert code==200 and d['receipt']['amount']==1499;assert call(c,'/api/session')[1]['inventory']['ember']==8
ok('refund records correct amount and does not decrement inventory',refund)
def cutoff():
 c=setup('cutoff');chat(c,'Where is order BK-1042?');s=chat(c,'Please find similar alternatives.');assert not any(q['eligible'] for q in s['quotes']);assert not s['pending'];assert 'None' in s['messages'][-1]['content']
ok('past-cutoff stock cannot be promised before the birthday',cutoff)
def shipped():
 c=setup('shipped');s=chat(c,'Refund order BK-1042.');assert s['escalation'] and not s['pending'] and not s['receipt']
ok('shipped parcel escalates instead of swapping or refunding',shipped)
def security():
 c=setup();s=chat(c,'Someone else changed my address.');assert s['escalation'];s=chat(c,'Refund it anyway.');assert not s['pending']
ok('security concern pauses automated changes',security)
def isolation():
 c=setup();token=prepare(c);other=setup();assert call(other,'/api/confirm',{'token':token})[0]==409
ok('another session cannot use a confirmation token',isolation)
def tamper():
 c=setup();prepare(c);assert call(c,'/api/confirm',{'token':'forged-token'})[0]==409;assert call(c,'/api/chat',{'message':'hello'},origin='https://attacker.example')[0]==400
ok('forged confirmation and cross-origin write rejected',tamper)
def concurrency():
 c=setup();token=prepare(c);op=lambda:call(c,'/api/confirm',{'token':token})
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:op(),range(2)))
 assert any(code==200 for code,d in results),results
 _,d=call(c,'/api/session');assert d['inventory']['ember']==7;assert d['state']['receipt']
ok('concurrent confirmation commits only one replacement',concurrency)
def validation():
 c=setup();assert call(c,'/api/chat',{'message':'x'*2001})[0]==400;assert call(c,'/api/scenario',{'scenario':'invented'})[0]==400
ok('input size and unknown scenario validation',validation)
print(json.dumps({'passed':len(checks),'checks':checks},indent=2))
