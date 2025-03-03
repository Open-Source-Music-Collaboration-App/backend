import os
import json
import shutil
import gzip
import xml.etree.ElementTree as ET

def extract_als_data(als_path):
    """Extract and parse Ableton ALS (XML) data from a GZIP file."""
    with gzip.open(als_path, 'rb') as file:
        tree = ET.parse(file)
        root = tree.getroot()
        # print(ET.tostring(root, encoding='utf8').decode('utf8'))
    
    return root
  
def xml_to_dict(element):
    """Recursively convert an XML element and its children to a dictionary."""
    result = {}
    
    # Convert attributes
    if element.attrib:
        result.update(element.attrib)
    
    # Convert child elements
    for child in element:
        child_data = xml_to_dict(child)
        
        # Handle multiple children with the same tag (store as list)
        if child.tag in result:
            if isinstance(result[child.tag], list):
                result[child.tag].append(child_data)
            else:
                result[child.tag] = [result[child.tag], child_data]
        else:
            result[child.tag] = child_data
    
    # If the element has text content, store it
    if element.text and element.text.strip():
        result["text"] = element.text.strip()
    
    return result

def parse_tracks(root):
    """Extract track details from the Ableton XML."""
    tracks_data = []
    tracks = root.find("LiveSet").find("Tracks")
    
    
    for track in tracks:
        if(track.tag != "AudioTrack" and track.tag != "MidiTrack"):
          continue
        track_id = track.attrib.get("Id", "Unknown")
        track_name = track.find("Name").find("EffectiveName").attrib.get("Value", "Unknown")
        devicechain = track.find("DeviceChain")
        sequencer = devicechain.find("MainSequencer")
        mixer = devicechain.find("Mixer")
        volume = mixer.find("Volume").find("Manual").attrib.get("Value", "Unknown")
        volumeMin = mixer.find("Volume").find("MidiControllerRange").find("Min").attrib.get("Value", "Unknown")
        volumeMax = mixer.find("Volume").find("MidiControllerRange").find("Max").attrib.get("Value", "Unknown")
        
        data = {
          "type": track.tag,
          "id": track_id,
          "name": track_name,
          "volume": volume,
          "volumeMin": volumeMin,
          "volumeMax": volumeMax
        }
        
        if track.tag == "MidiTrack":
          # for each event:
          # if its a single sample midi clip:
          # [
          #   -start
          #   -end
          #   -loop_info
          #   -notes:
          #     [ #for each note
          #       -key
          #       -num_occurences
          #       -occurences:
          #         [  # every occurence of that note
          #           -start
          #           -duration
          #           -velocity
          #           -velocity_deviation
          #           -enabled
          #     
          #         ]
          #     ]
          #   ]
          #
          # ]
          
          events = [xml_to_dict(event) for event in sequencer.find("ClipTimeable").find("ArrangerAutomation").find("Events").findall("MidiClip")]
          formatted_events = []
          for event in events:
            keytracks = event["Notes"]["KeyTracks"]["KeyTrack"]
            #if keytracks has only one element it is a dict
            # if it has more than one element it is a list
            # print(keytracks)
            if isinstance(keytracks, dict):
              keytracks = [keytracks]
            # print(len(keytracks))
            
            notes = []
            
            start = event["CurrentStart"]["Value"]
            end = event["CurrentEnd"]["Value"]
            loopStart = event["Loop"]["LoopStart"]["Value"]
            loopEnd = event["Loop"]["LoopEnd"]["Value"]
            
            eventRange = int(end) - int(start)
            loopRange = int(loopEnd) - int(loopStart)
            repeats = eventRange // loopRange
            lastLoopRange = eventRange % loopRange
            
            
            
            for i in range(len(keytracks)):
              keytrack = keytracks[i]
              num_occurences = len(keytrack["Notes"]["MidiNoteEvent"])
              occurences_data = []
              for occurence in keytrack["Notes"]["MidiNoteEvent"]:
                occurence_data = {
                  "start": occurence["Time"],
                  "duration": occurence["Duration"],
                  "velocity": occurence["Velocity"],
                  "velocity_deviation": occurence["VelocityDeviation"],
                  "enabled": occurence["IsEnabled"]
                }
                occurences_data.append(occurence_data)
              note_data = {
                "key": keytrack["MidiKey"],
                "num_occurences": num_occurences,
                "occurences": occurences_data
              }
              notes.append(note_data)
              
            if repeats == 1 and lastLoopRange == 0:
              event_data = {
                "start": event["CurrentStart"]["Value"],
                "end": event["CurrentEnd"]["Value"],
                "loop": {
                  "start": event["Loop"]["LoopStart"]["Value"],
                  "end": event["Loop"]["LoopEnd"]["Value"],
                  "on": event["Loop"]["LoopOn"]["Value"],
                  "hiddenLoopStart": event["Loop"]["HiddenLoopStart"]["Value"],
                  "hiddenLoopEnd": event["Loop"]["HiddenLoopEnd"]["Value"]
                },
                "notes": notes
              }
              formatted_events.append(event_data)
              data["events"] = formatted_events     
            else:
              for r in range(int(repeats)):
                event_data = {
                  "start": int(start) + (r * loopRange),
                  "end": int(start) + ((r + 1) * loopRange),
                  "loop": {
                    "start": loopStart,
                    "end": loopEnd,
                    "on": event["Loop"]["LoopOn"]["Value"],
                    "hiddenLoopStart": event["Loop"]["HiddenLoopStart"]["Value"],
                    "hiddenLoopEnd": event["Loop"]["HiddenLoopEnd"]["Value"]
                  },
                  "notes": notes
                }
                formatted_events.append(event_data)
              if lastLoopRange > 0:
                event_data = {
                  "start": int(start) + (repeats * loopRange),
                  "end": int(start) + (repeats * loopRange) + lastLoopRange,
                  "loop": {
                    "start": loopStart,
                    "end": loopEnd,
                    "on": event["Loop"]["LoopOn"]["Value"],
                    "hiddenLoopStart": event["Loop"]["HiddenLoopStart"]["Value"],
                    "hiddenLoopEnd": event["Loop"]["HiddenLoopEnd"]["Value"]
                  },
                  "notes": notes
                }
                formatted_events.append(event_data)
              data["events"] = formatted_events
        # print(json.dumps(data, indent=4))   
        
        elif track.tag == "AudioTrack":
          # for each event:
          # [
          #   -start
          #   -end
          #   -audio_name
          #   -audio_file
          #   -loop_info
          #   -PitchCoarse
          #   -PitchFine
          #   
          # ]
          #
          
          events = [xml_to_dict(event) for event in sequencer.find("Sample").find("ArrangerAutomation").find("Events").findall("AudioClip")]
          formatted_events = []
          for event in events:
            event_data = {
              "start": event["CurrentStart"]["Value"],
              "end": event["CurrentEnd"]["Value"],
              "audio_name": event["Name"]["Value"],
              "audio_file": event["SampleRef"]["FileRef"]["RelativePath"]["Value"],
              "loop": {
                "start": event["Loop"]["LoopStart"]["Value"],
                "end": event["Loop"]["LoopEnd"]["Value"],
                "on": event["Loop"]["LoopOn"]["Value"]
              }
              
            }
            formatted_events.append(event_data)
            data["events"] = formatted_events
        
        
        
        
        tracks_data.append(data)
    # print(json.dumps(tracks_data, indent=4))
    return tracks_data

def match_wav_files(folder_path, als_name, tracks):
    """Match track names with corresponding bounced WAV files."""
    wav_files = [f for f in os.listdir(folder_path) if f.endswith(".wav")]
    matched_tracks = []
    
    for track in tracks:
        track_number = track["id"]
        expected_filename = f"{als_name} {track['name']}.wav"
        
        matching_wav = next((wav for wav in wav_files if wav.startswith(f"{als_name} {track['name']}")), None)
        # print(f"Matching {expected_filename} with {matching_wav}")
        if matching_wav:
            track["wav_file"] = matching_wav
            matched_tracks.append(track)
    
    return matched_tracks

def clean_tracks_folder(tracks_folder):
    """Clear the tracks/ folder before moving new bounced files."""
    if os.path.exists(tracks_folder):
        shutil.rmtree(tracks_folder)
    os.makedirs(tracks_folder)

def move_bounced_tracks(folder_path, tracks_folder, matched_tracks):
    """Move matched WAV files to the tracks/ folder."""
    for track in matched_tracks:
        if track["wav_file"]:
            src_path = os.path.join(folder_path, track["wav_file"])
            dest_path = os.path.join(tracks_folder, track["wav_file"])
            shutil.copy(src_path, dest_path)

def main(folder_path, output_folder=None):
    """Main function to parse the Ableton project and process WAV files."""
    als_file = next((f for f in os.listdir(folder_path) if f.endswith(".als")), None)
    if not als_file:
        print("No Ableton project (.als) found!")
        return
    
    als_name = os.path.splitext(als_file)[0]
    als_path = os.path.join(folder_path, als_file)
    
    print(f"Parsing Ableton Project: {als_name}.als")
    
    # Extract and parse the ALS XML
    root = extract_als_data(als_path)
    
    # Extract track details
    tracks = parse_tracks(root)
    
    maintrack = root.find("LiveSet").find("MainTrack")
    tempo = maintrack.find("DeviceChain").find("Mixer").find("Tempo").find("Manual").attrib.get("Value", "Unknown")
    
    # # Match tracks with corresponding bounced WAV files
    matched_tracks = match_wav_files(folder_path, als_name, tracks)
    
    # Validate track count
    expected_tracks = len(tracks)
    matched_track_count = len(matched_tracks)
    print(f"Expected Tracks: {expected_tracks}, Matched Tracks: {matched_track_count}")
    
    # Clear and repopulate tracks folder
    tracks_folder = "./tracks" if not output_folder else os.path.join(output_folder, "tracks")
    clean_tracks_folder(tracks_folder)
    move_bounced_tracks(folder_path, tracks_folder, matched_tracks)
    
    # Save JSON output
    json_output_path = os.path.join("./" if not output_folder else output_folder, "ableton_project.json")
    with open(json_output_path, "w") as json_file:
        json.dump({"project": als_name, "tempo": tempo, "tracks": matched_tracks}, json_file, indent=4)
    
    print(f"Ableton project parsed and saved to {json_output_path}")
    print(f"Bounced tracks saved in: {tracks_folder}/")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python parseAbleton.py <folder_path> <optional: output_folder>")
    else:
        main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
      