import os
os.chdir("/Users/migui/Documents/project-atlas 2/backend")

p = "src/Atlas.Infrastructure/Persistence/DbSeeder.cs"
s = open(p).read()

new_rows = '''            ("l28","pokemon","Blastoise Base Set Holo","Blastoise","Kanto",1999,"Base Set",null,false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,15000,null,0,0,5,s2,"Original water artillery holo. Vivid pattern, light whitening on two corners."),
            ("l29","pokemon","Latias ex SIR — Surging Sparks","Latias ex","Hoenn",2024,"Surging Sparks","Special Illustration Rare",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.Auction,11000,9800,11,30,3,s1,"Stunning alt-art from the newest set. Pulled first-hand."),
        };'''
old_tail = '''            ("l27","one_piece","Shanks OP-01 ST21 Leader — SOLD","Shanks","Red Hair Pirates",2022,"Romance Dawn",null,false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,4800,null,0,0,9,s2,"Picked up same-day by a Cebu buyer."),
        };'''
assert old_tail in s
s = s.replace(old_tail, new_rows)

s = s.replace('''            ["l25"] = "/seed-images/mew-ex-151.png",
        };''','''            ["l25"] = "/seed-images/mew-ex-151.png",
            ["l28"] = "/seed-images/blastoise-base1.png",
            ["l29"] = "/seed-images/latias-ex-ssp.png",
        };''')
open(p, "w").write(s)
print("seeder ok")

p = "src/Atlas.Web.Api/Controllers/ListingsController.cs"
s = open(p).read()
if "ILike(l.Sport" not in s:
    s = s.replace('''                EF.Functions.ILike(l.Set, $"%{q}%"));''',
'''                EF.Functions.ILike(l.Set, $"%{q}%") ||
                EF.Functions.ILike(l.Sport, $"%{q}%"));''')
open(p, "w").write(s)
print("search ok")
