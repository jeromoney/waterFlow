"""
Creates a river segment of WW from the putin points provided by American Whitewater
"""

MAXRIVERLENGTH = 20 #miles. Assumption used so river segments don't hundreds of miles

from flowCalulator import connect2db
class riverSegment:
    ''' A section of a river corresponding to the NHD+ data'''
    def __init__(self, hydroseq, divergence, upstreamSeq, downstreamSeq, lengthkm, terminationFlag, watershed):
        self.id = hydroseq # Using hydrosequence as ID although there are other choices
        self.divergence = divergence
        self.lengthmi = lengthkm * 0.621371
        self.upstreamSeq = upstreamSeq
        self.upstream = None # actual class instance of object, not just hydroseq
        self.downstreamSeq = downstreamSeq
        self.downstream = None # actual class instance of object, not just hydroseq
        self.gauge = None
        self.terminationFlag = terminationFlag
        self.watershed = watershed



class boatingSegment:
    '''A segment of a river corresponding to the American Whitewater descriptions.
    typically a few miles long.
    '''
    def __init__(self, riverNode, takeout = None):
        self.putin = riverNode
        self.takeout = takeout
        self.downstream_segs = [self.putin]
        self.lengthmi = self.putin.lengthmi
        self.terminationReason = None
        self.conflictingNodes = None
    def get_downstream_segs(self,putinNodes):
        # travel downstream until end of boating segment
        node = self.putin.downstream
        while True:
            if node is None:
                self.terminationReason = "Downstream is null"
                break
            if node.id in putinNodes.keys() and node != self: #reach the putin of another segment
                self.terminationReason = "reached another put-in"
                break
            elif self.lengthmi > MAXRIVERLENGTH: #segment is longer than 20 miles
                self.terminationReason = "length exceeded {} miles".format(MAXRIVERLENGTH)
                break
            elif False: #segment joins another WW segment.
                self.terminationReason = "segment merged with another segment"
                break
            elif node.terminationFlag: # Segment ends a in sink or ocean
                self.terminationReason = "river peters out"
                break
            self.downstream_segs.append(node)
            self.lengthmi += node.lengthmi
            node = node.downstream
    def prune_downstream_segs(self,node):
        # prunes everything downstream including the node
        index_pos = self.downstream_segs.index(node)
        self.downstream_segs = self.downstream_segs[:index_pos]
    def insert_sql(self,conn,cursor,debug = False):
        if not debug:
            for seg in self.downstream_segs:
                cursor.execute( \
                    "INSERT INTO ww_segments (putin,segment) VALUES (%s,%s)", \
                    (self.putin.id, seg.id))
        cursor.execute( \
            "INSERT INTO termination_reasons VALUES (%s,%s)", \
            (self.putin.id, self.terminationReason))
        conn.commit()
    def find_conflict(self, putinNodes, resolve = False):
        # Idenitifies boating segments that have overlapping stretches
        # putinNodes are assumed not to contain self
        # node should not be in nodes
        putinNodes.remove(self)
        self.conflictingNodes = []
        for node in putinNodes:
            if not set(self.downstream_segs).isdisjoint(node.downstream_segs):
                # segments have overlapping elements. deal with them later
                self.conflictingNodes.append(node)
        if resolve:
            self.resolve_conflict()

    def resolve_conflict(self):
        for node in self.conflictingNodes:
            # Verify there still exists a conflict.
            if not set(self.downstream_segs).isdisjoint(node.downstream_segs):
                # Decide which is the major/minor
                # Prune the minor downstream
                # Find the conflict point
                for seg in self.downstream_segs:
                    if seg in node.downstream_segs:
                        conflict_node = seg
                        break

                # Make a decision
                node2prune = None
                # Prune the node that a smaller watershed
                self_indx = self.downstream_segs.index(conflict_node) - 1
                node_indx = node.downstream_segs.index(conflict_node) - 1
                assert min(self_indx, node_indx) >= 0
                # Checking that no conflicts occur at the start of the segment. This shouldn't happen.
                nodeWatershed = node.downstream_segs[node_indx].watershed
                selfWatershed = self.downstream_segs[self_indx].watershed
                if nodeWatershed > selfWatershed:
                    node2prune = self
                else:
                    node2prune = node

                # Prune all node downstream of conflicting point
                indx_pos = node2prune.downstream_segs.index(conflict_node)
                node2prune.downstream_segs = node2prune.downstream_segs[:indx_pos]
                node2prune.terminationReason = 'Segment deemed minor'



def get_awnodes(cursor,riverNodes):
    '''Gets list of AW putins and matching river segments'''
    # lake michigan/Superior is actually a listing of various surf spots
    cursor.execute("SELECT hydroseq::INT FROM riverlevels WHERE hydroseq is not null AND not (name like \'%Lake Michigan%\' OR name like \'%Lake Superior%\')")
    datum = [x[0] for x in cursor.fetchall()]
    putinNodes = {}
    for data in datum:
        putinNodes[data] = boatingSegment(riverNodes[data])

    return putinNodes

def get_river_nodes(cursor):
    riverNodes = {}
    # added an exception for a section on Lake Michigan
    cursor.execute("SELECT hydroseq::INT, divergence, uphydroseq::INT,dnhydroseq::INT,lengthkm,terminalfl = 1,totdasqkm FROM \"NHDSnapshot_NHDFlowline_Network\" n WHERE hydroseq in \
    (90002176,90000687,90001151,150001515,90000645,150000699,150000286,150000025)\
     OR ftype <> \'Coastline\'")
    for row in cursor:
        hydroseq, divergence, uphydroseq, dnhydroseq, lengthkm, terminalfl,totdasqkm = row
        riverNode = riverSegment(hydroseq, divergence, uphydroseq, dnhydroseq, lengthkm, terminalfl, totdasqkm)
        riverNodes[hydroseq] = riverNode
    return riverNodes

def main():
    cursor,conn = connect2db()
    cursor.execute("TRUNCATE TABLE termination_reasons")
    cursor.execute("TRUNCATE TABLE ww_segments")
    conn.commit()

    # intialize river segments
    riverNodes = get_river_nodes(cursor) # a dictionary hashed by the hydroseqence
    # add upstream and downstream connections
    for hydroseq in riverNodes.keys():
        node = riverNodes[hydroseq]
        node.upstream = riverNodes.get(node.upstreamSeq, None)
        node.downstream = riverNodes.get(node.downstreamSeq, None)

    putinNodes = get_awnodes(cursor,riverNodes) #put-ins, not the president of russia

    # search for downstream segments to complete the boating segments
    for node in putinNodes.keys():
        putinNodes[node].get_downstream_segs(putinNodes)

    # make sure there are no overlaps in downstream segments. This would occur if a run joins another run
    # Strategy: find a conflict. make a decision. prune downstream segments.
    putinNodescpy = putinNodes.values()
    while putinNodescpy != []:
        print "List: ",len(putinNodescpy)
        if len(putinNodescpy) == 5200:
            x = 1
        node = putinNodescpy[0]
        node.find_conflict(putinNodescpy, resolve = True)
        if node in putinNodescpy:
            putinNodescpy.remove(node)

    for node in putinNodes.keys():
        putinNodes[node].insert_sql(conn, cursor)


if __name__ == "__main__":
    main()